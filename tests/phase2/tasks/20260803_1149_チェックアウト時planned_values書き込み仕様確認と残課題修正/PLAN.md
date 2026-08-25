# タスク計画書: チェックアウト時 planned_values 書き込み仕様確認と残課題修正

## メタデータ
- **作成日時**: 2026-08-03 11:49
- **タスクID**: checkout-planned-values-spec-check
- **優先度**: 高
- **推定工数**: 1.5時間

## タスク概要

「チェックアウトボタンを押したら MAIMLファイルの `<results>` タグ配下に
`experiment_plan.planned_values` の値が書き込まれる」という仕様について、
現在の実装との差異を調査・確認し、残課題を修正する。

## 調査結果

### ✅ 既に修正済み（`20260803_1033` 計画書で対応完了）

`maimlWriterService.writeExperimentPlanProperties()` は2層フラット構造に対応済み：

```typescript
// planned_values: { [transitionId]: { [fieldKey]: value }, "__meta__": {...} }
for (const [transitionId, fieldMap] of Object.entries(plannedValues)) {
  if (transitionId === '__meta__') continue;
  for (const [fieldKey, value] of Object.entries(fieldMap)) {
    if (typeof value === 'string') {
      planFlatValues[fieldKey] = value;
    }
  }
}
// → template_data.property_set.properties[].value を更新
// → buildDataXML() で <data><results>...</results></data> XML 生成
// → MAIML の <data> セクションを置き換えて S3 保存
```

**大枠の仕様（planned_values → results書き込み）は現在の実装と合っている。**

### ❌ 残課題（新規発見）

#### 課題1（優先度：高）: `__uncertainty__` がMAIMLに書き込まれない

`planned_values` に不確かさ情報が `__uncertainty__` キーで保存されているが、
`writeExperimentPlanProperties()` は `typeof value === 'string'` の場合のみ処理するため
`object` 型の `__uncertainty__` は常にスキップされる。

```typescript
// 現状のコード（maimlWriterService.ts）
if (value !== null && value !== undefined && typeof value === 'string') {
  planFlatValues[fieldKey] = value;  // string[] や object はスキップ → __uncertainty__ も無視
}
```

`template_data.property_set.properties[].uncertainties` に不確かさデータを反映し、
`buildPropertyXML()` の `uncertainties` 出力ロジックに流す必要がある。

#### 課題2（優先度：中）: 複数トランジションで同一キーがある場合に後勝ちで上書き

全トランジションの fieldKey をフラット化しているため、
異なる `transitionId`（= place_id）で同じキー名のプロパティが存在する場合、
後のトランジションの値で上書きされる。

ただし現実のMAIML構造では同一メソッド内で同一キー名が重複することは稀なため、
本タスクでは**課題1のみを修正対象**とする。

## 修正対象ファイル

| ファイル | 変更内容 |
|---|---|
| `backend/src/services/maimlWriterService.ts` | `__uncertainty__` キーの値を `planFlatUncertainties` として分離し、`updatePropertySetByPlanWithUncertainty()` に渡す |
| `backend/src/repositories/templateDataRepository.ts` | `updatePropertySetByPlanWithUncertainty()` メソッドを追加（uncertainties フィールドへの反映） |

## 実装ステップ

- [x] `templateDataRepository.ts`: `updatePropertySetByPlanWithUncertainty()` メソッド追加
- [x] `maimlWriterService.ts`: `__uncertainty__` を抽出して新メソッドに渡す処理を追加

## 承認記録
- **計画書提示日時**: 2026-08-03 11:49
- **承認日時**: 2026-08-03 11:51

## 実施記録
- **開始**: 2026-08-03 11:51
- **完了**: 2026-08-03 11:53

### 変更内容
1. `backend/src/repositories/templateDataRepository.ts`  
   - `updatePropertySetByPlanWithUncertainty()` メソッドを追加  
   - `{ [propertyKey]: uncertaintyArray }` を受け取り、`properties[].uncertainties` に反映して UPSERT

2. `backend/src/services/maimlWriterService.ts`  
   - `writeExperimentPlanProperties()` の `planned_values` パース処理を拡張  
   - `fieldKey === '__uncertainty__'` の場合は `planFlatUncertainties` に分離して収集  
   - `updatePropertySetByPlan`（文字列値反映）と `updatePropertySetByPlanWithUncertainty`（不確かさ反映）を条件に応じて呼び分け
