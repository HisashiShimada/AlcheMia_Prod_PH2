# タスク計画書: WorkRecordPanel addedValues テンプレート切替時欠落修正

## メタデータ

- **作成日時**: 2026-09-25
- **タスクID**: 20260925_WorkRecordPanel_addedValues切替時欠落修正
- **優先度**: 高
- **推定工数**: 1時間

---

## タスク概要

`WorkRecordPanel.tsx` の定量評価入力行（`addedValues`）がテンプレート切り替え時に欠落する問題を修正する。確信度（`confidence`）や実績値と同様に、テンプレート切り替え後も入力値が引き継がれるようにする。

---

## 根本原因

`uncertaintyValuesRef` への**書き込みキー**と**読み込みキー**が食い違っている。

### 書き込みキー（現状）

| 箇所 | キー形式 |
|------|---------|
| DB `recordedValue` による初期化（2499行目） | `tpl.id`（= `templateId` のみ） |
| `onUncertaintyValuesChange` ハンドラ（3564行目） | `placeId`（= `templateId` のみ） |

### 読み込みキー（現状）

| 箇所 | キー形式 |
|------|---------|
| `onGetInitialUncertaintyValues`（3616〜3617行目） | `${placeId}__${propKey}` |

書き込み時は `templateId` のみ、読み込み時は `templateId__propKey` を使っているため、テンプレート切替時に復元が常に空になっている。

### キー設計の比較

`confidenceValuesRef`（正常に動作している）はキーを `${templateId}__${propKey}` で統一しているため復元できている。`uncertaintyValuesRef` も同じ形式に統一すれば良い。

ただし `uncertaintyValuesRef` の1エントリは複数 propKey にまたがる `UncertaintyValueEntry[]` を保持する設計（`entries` に `propKey` フィールドがある）になっており、現在は `templateId` をキーとして **全プロパティ分をまとめて1エントリ** で管理している。

この設計のまま読み込みキーを `templateId__propKey` に変えると読み込み側では `propKey` でフィルタして返す必要がある。

### 修正方針

**書き込み・読み込みキーを `templateId` に統一し、読み込み側で `propKey` フィルタをかける。**

- 書き込みキーはそのまま `templateId`（= `placeId`）を維持する
- 読み込み（`onGetInitialUncertaintyValues`）のキーを `${placeId}__${propKey}` → `placeId` に変更し、取得した entries を `propKey` でフィルタして返す

この方式であれば書き込み側を一切変更せずに、読み込み側の1行修正だけで解消できる。

---

## 追加の問題: 初期 `isPreset` 行の値が Ref に登録されない

`handleValueChange` / `handleUncertaintyKeyChange` は `uncertaintyKey && value` 両方が揃った行のみを `onUncertaintyValuesChange` に通知する。

プリセット行（`isPreset: true`）は `uncertaintyKey` が初期から設定されているが、ユーザーが value を入力しても `uncertaintyKey` のみで value が空の状態では通知されない（逆に value を入力した後の状態は通知される）。

→ この問題は `handleValueChange` / `handleUncertaintyKeyChange` の既存フィルタロジックが原因だが、今回の切替時欠落の主因は上記キー不一致であるため、今回の修正では読み込みキーの修正のみ対応する。

---

## 実装ステップ

### STEP 1: `onGetInitialUncertaintyValues` の読み込みキーを修正

**ファイル:** `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx`

**対象行:** 3615〜3618行目

```typescript
// 修正前
onGetInitialUncertaintyValues: (placeId: string, propKey: string): UncertaintyValueEntry[] => {
  const key = `${placeId}__${propKey}`;
  return uncertaintyValuesRef.current.get(key) ?? [];
},

// 修正後
onGetInitialUncertaintyValues: (placeId: string, propKey: string): UncertaintyValueEntry[] => {
  const entries = uncertaintyValuesRef.current.get(placeId) ?? [];
  return entries.filter((e) => e.propKey === propKey);
},
```

- [ ] 3616行目のキーを `${placeId}__${propKey}` → `placeId` に変更
- [ ] `return` 文で `propKey` フィルタをかけるよう変更

---

## 変更ファイル一覧

| # | ファイル | 変更種別 | 対応STEP |
|---|---------|---------|---------|
| 1 | `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | 修正 | STEP 1 |

---

## 影響範囲

- `uncertaintyValuesRef` の書き込み側（初期化・`onUncertaintyValuesChange`）は変更なし
- `onGetInitialUncertaintyValues` の戻り値型（`UncertaintyValueEntry[]`）は変更なし
- `PropertyCard` の `initialUncertaintyValues` への受け渡しロジックは変更なし

---

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `uncertaintyValuesRef` に同 `placeId` の複数 `propKey` エントリが混在する場合に誤フィルタが起きる | 低 | 低（`entries` の各要素に `propKey` フィールドが存在し、フィルタは propKey 一致のみ） | 既存の `UncertaintyValueEntry` 型が `propKey` を必須フィールドとして持つため問題なし |

---

## テスト計画

### 手動テスト
- [ ] テンプレートが複数ある状態で、1枚目テンプレートの定量評価 value を入力
- [ ] テンプレートを2枚目に切り替え後、1枚目に戻す
- [ ] 入力した value が復元されていること
- [ ] 2枚目テンプレートの定量評価 value に影響がないこと

---

## 承認記録

- **計画書提示日時**: 2026-09-25
- **承認日時**: 2026-09-25
- **承認者コメント**: 承認します。

## 実施記録

### 実施日時
開始: 2026-09-25
完了: 2026-09-25

### 最終的な成果物
- [x] STEP 1: `onGetInitialUncertaintyValues` の読み込みキーを `${placeId}__${propKey}` → `placeId` に修正し、`propKey` フィルタで返すよう変更

### TypeScript ビルド結果
- フロントエンド: `tsc --noEmit` → エラーなし（exit:0）
