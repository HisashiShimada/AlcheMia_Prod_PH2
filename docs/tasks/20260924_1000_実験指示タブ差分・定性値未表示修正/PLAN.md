# タスク計画書：実験指示タブ「差分」「定性：基準名」「定性：付与値」未表示修正

## メタデータ
- **作成日時**: 2026-09-24 10:00
- **タスクID**: 20260924_1000_実験指示タブ差分・定性値未表示修正
- **優先度**: 高
- **推定工数**: 1〜2時間

## タスク概要

実験管理者メニュー > プロジェクト管理タブ > 実験指示タブ（`ExperimentInstructionTab`）の以下3列が常に空（`—`）になっている。  
実験作業者メニューの実験記録タブ内で「保存」ボタンを押下した際に `experiment_instruction_detail` テーブルに定性評価の選択値が正しく格納されていないことが原因。

| 列名 | DBカラム | 問題 |
|------|---------|------|
| 差分 | `actual_value` - `expected_value` 計算 | 文字列型で返るため数値比較不可 → 常に `—` |
| 定性：基準名 | `uncertainty_key` → `uncertainty_criteria` | 保存時キーミスマッチで `null` 保存 |
| 定性：付与値 | `uncertainty_assigned_value` | 保存時キーミスマッチで `null` 保存 |

---

## 調査結果・原因の詳細

### 問題① 差分が表示されない

`actual_value` / `expected_value` はDB上 `CHARACTER VARYING`（文字列）カラム。  
バックエンドから文字列として返却されるが、`DiffCell` は `typeof === 'number'` でガードしているため常に `—`。

```typescript
// ExperimentInstructionTab.tsx DiffCell（修正前）
if (typeof expected !== 'number' || typeof actual !== 'number') {
  return <Text type="secondary">—</Text>;  // ← 文字列なので常にここで終了
}
```

**修正**: `parseFloat` で数値変換し、変換失敗時のみ `—` 表示。

---

### 問題② ③ 定性：基準名・付与値が入らない

#### キーミスマッチの発生箇所

```
【フロントエンド WorkRecordPanel.tsx】

1. getTemplateData() レスポンス
     TemplateDataItem.placeId    = "P001"      ← プレースID
     TemplateDataItem.templateId = "T_temp01"  ← MAIMLのtemplate.id

2. WorkTemplate 構築（2421行）:
     builtTemplates[n].id = item.placeId       ← placeId をテンプレートIDとして使用 ← 起点

3. 定性評価ボタン選択時:
     confidenceValuesRef["P001__ns1:Temp"] = { templateId: "P001", value: "確か" }

4. handleSave 時:
     qualitativeValues = [{ templateId: "P001", propKey: "ns1:Temp", value: "確か" }]
     （placeId が templateId として送信される）

↓ POST /api/...

【バックエンド _updateInstructionDetails】

5. qualMap 構築:
     qualMap["P001__ns1:Temp"] = { value: "確か" }

6. savedRecords ループ:
     ps.templateId = "T_temp01"   ← MAIMLのtemplate.id
     place_id      = "P001"
     mapKey = "T_temp01__ns1:Temp"
     qual = qualMap.get("T_temp01__ns1:Temp") → undefined ❌

   updateActualAndUncertainty({
     uncertaintyKey:           null,  ← null 保存 ❌
     uncertaintyAssignedValue: null,  ← null 保存 ❌
   })
```

**修正**: `qualMap` 検索に `place_id` フォールバックを追加する。

---

## 変更ファイル一覧

| # | ファイルパス | 変更内容 |
|---|------------|---------|
| 1 | `backend/src/services/experimentDataService.ts` | `_updateInstructionDetails` で `qualMap` 検索に placeId フォールバック追加（2行） |
| 2 | `frontend/src/components/project/ExperimentInstructionTab.tsx` | `DiffCell` で `parseFloat` による数値変換追加 |

---

## 修正前/修正後 機能フロー図

### 修正前（バグあり）
```
保存ボタン押下
→ qualitativeValues = [{ templateId: "P001", value: "確か" }]
→ _updateInstructionDetails:
     mapKey = "T_temp01__ns1:Temp"
     qual = qualMap.get("T_temp01__ns1:Temp") → undefined ❌
→ experiment_instruction_detail: uncertainty_key=null, uncertainty_assigned_value=null ❌
→ 実験指示タブ: 差分=—, 定性：基準名=—, 定性：付与値=— ❌
```

### 修正後
```
保存ボタン押下
→ qualitativeValues = [{ templateId: "P001", value: "確か" }]
→ _updateInstructionDetails:
     mapKey = "T_temp01__ns1:Temp"
     mapKeyByPlace = "P001__ns1:Temp"
     qual = qualMap.get("T_temp01__ns1:Temp") ?? qualMap.get("P001__ns1:Temp")
          = { value: "確か" } ✅
→ experiment_instruction_detail: uncertainty_key="uc_key_01", uncertainty_assigned_value="確か" ✅
→ 実験指示タブ: 差分=+1.0, 定性：基準名=温度安定性, 定性：付与値=確か ✅
```

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| placeId == MAIMLのtemplate.id のケース（両方マッチ） | 低 | `??` 短絡評価のため先にマッチした側が使われ問題なし |
| 非数値文字列が `parseFloat` で NaN になる | 低 | `isNaN` チェックで `—` 表示（仕様通り） |

---

## テスト計画
- [ ] 実験記録タブで数値を入力して保存 → 差分列に値が表示されること
- [ ] 実験記録タブで定性評価を選択して保存 → 定性：基準名・付与値列に値が表示されること
- [ ] `cd frontend && npx tsc --noEmit` エラーなし
- [ ] `cd backend && npx tsc --noEmit` エラーなし

---

## 承認記録
- **計画書提示日時**: 2026-09-24 10:00
- **承認日時**: 2026-09-24（act モード切替で承認済み）

## 実施記録
### 実施日時
開始: 2026-09-24 10:00

### 最終的な成果物
- [x] `backend/src/services/experimentDataService.ts` 修正
- [x] `frontend/src/components/project/ExperimentInstructionTab.tsx` 修正
- [x] ビルド確認完了（backend: exit 0, frontend: exit 0）
