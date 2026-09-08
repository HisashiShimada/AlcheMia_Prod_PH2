# タスク計画書: Uncertainty 型選択肢拡充と単位制御

## メタデータ

- **作成日時**: 2026-09-07 01:00
- **タスクID**: 20260907_0100_Uncertainty型選択肢拡充と単位制御
- **優先度**: 中
- **推定工数**: 1時間

---

## 1. タスク概要

`UncertaintyCreateModal.tsx` / `UncertaintyDetailModal.tsx` の xsi:type 選択肢が 3種のみ（`doubleType` / `decimalType` / `intType`）で、かつ両ファイルで重複定義されている。前タスク（20260907_0000）で整備した共通定数を活用し、数値型全種（11種 + 数値リスト型11種）に拡充する。また型変更時の単位（units）フィールド制御も追加する。

---

## 2. 現状調査結果

### 2-1. 問題のある `XSI_TYPE_OPTIONS`（両ファイルで重複）

```ts
// UncertaintyCreateModal.tsx 26行目
// UncertaintyDetailModal.tsx 30行目（同一内容）
const XSI_TYPE_OPTIONS = [
  { value: 'doubleType',  label: 'doubleType'  },
  { value: 'decimalType', label: 'decimalType' },
  { value: 'intType',     label: 'intType'     },
];
```

→ **3種のみ・2ファイルで重複定義**

### 2-2. 不確かさ基準の xsi:type に適切な型の範囲

`xsiTypeAttributes.ts` の `ALLOWED_ATTRIBUTES_BY_XSI_TYPE` より、`units` が許可される型（= 不確かさ基準に意味がある数値型）:
- 数値 Simple: `decimalType`, `doubleType`, `floatType`, `intType`, `longType`, `shortType`, `byteType`, `unsignedIntType`, `unsignedLongType`, `unsignedShortType`, `unsignedByteType`（11種）
- 数値 List: 同上の `～ListType` 形式（11種）
- Content数値: `contentDoubleListType`, `contentFloatListType`, `contentIntListType`

### 2-3. 単位制御の現状

- 定量モードでは型に関わらず `units` Input が常に有効（現状3種はすべて数値型なので問題が顕在化していないが、型拡充後に備えて制御を追加する）

### 2-4. 対象外コンポーネント

- `UncertaintyCriteriaSelectorModal.tsx` / `UncertaintyCriteriaSelectorPanel.tsx`: `xsiType` はフィルタ・表示用のみ → 対象外
- `UncertaintyManagement.tsx`: 直接 xsiType 選択肢を持たない → 対象外

---

## 3. 目的と期待される成果

- [ ] `XSI_TYPE_OPTIONS` の重複定義を排除し、共通定数から生成する
- [ ] xsi:type 選択肢を数値型全種（最大22種）に拡充する
- [ ] xsi:type 変更時に `units` フィールドを disabled 制御する（型拡充後の安全性確保）

---

## 4. 実装ステップ

### ステップ1: `xsiTypeAttributes.ts` に `NUMERIC_PROPERTY_TYPES` を追加

- [ ] `MAIML_PROPERTY_TYPES.filter(t => isUnitAllowed(t.value))` で数値型のみ絞り込んだ定数 `NUMERIC_PROPERTY_TYPES` を export する
  - Simple 数値型 11種 + List 数値型 11種 = 計 22種
  - `MAIML_PROPERTY_TYPES` と `isUnitAllowed` から自動導出することで DRY を維持する

### ステップ2: `UncertaintyCreateModal.tsx` の修正

- [ ] `xsiTypeAttributes.ts` から `NUMERIC_PROPERTY_TYPES` を import
- [ ] `XSI_TYPE_OPTIONS` ローカル定数を削除
- [ ] xsi:type セレクトの `options` を `NUMERIC_PROPERTY_TYPES` に差し替え
- [ ] xsi:type 変更時（`Form.Item` の `onValuesChange` または `Select` の `onChange`）で `units` を `isUnitAllowed()` で制御
  - 数値型のみの選択肢なので現状は常に有効だが、将来の安全性のため実装する

### ステップ3: `UncertaintyDetailModal.tsx` の修正

- [ ] ステップ2と同様の対応

### ステップ4: 動作確認

- [ ] TypeScript コンパイルエラーなし確認（`tsc --noEmit`）
- [ ] 新規作成モーダルで xsiType に `floatType`, `longType` 等が表示されることを確認
- [ ] 詳細モーダルで同様に確認

---

## 5. 影響範囲の分析

| ファイル | 変更内容 | 影響度 |
|---------|---------|--------|
| `frontend/src/utils/xsiTypeAttributes.ts` | `NUMERIC_PROPERTY_TYPES` 定数を追加エクスポート | 低（既存 export 変更なし） |
| `frontend/src/components/uncertainty/UncertaintyCreateModal.tsx` | `XSI_TYPE_OPTIONS` → `NUMERIC_PROPERTY_TYPES` に差し替え | 中（UI変更） |
| `frontend/src/components/uncertainty/UncertaintyDetailModal.tsx` | 同上 | 中（UI変更） |

### セキュリティ・認証への影響
- なし（フロントエンドのUI制御のみ）

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存DBデータの `xsi_type` が `doubleType`/`decimalType`/`intType` 以外の場合に詳細モーダルで表示が変わる | 低 | 低 | 選択肢を増やすだけで既存値の変更はなし。Selectに存在しない値があれば表示されるだけ |
| `NUMERIC_PROPERTY_TYPES` のフィルタロジックが意図しない型を含む | 低 | 低 | `isUnitAllowed()` の実装を確認済み（数値型のみ true） |

---

## 7. テスト計画

### 手動テスト

- [ ] UncertaintyManagement 画面で「新規作成」を押す
- [ ] xsi:type セレクトに `floatType`, `longType`, `shortType` 等が表示されることを確認
- [ ] 一覧から既存基準を選択して詳細モーダルを開く
- [ ] 詳細モーダルで xsi:type セレクトに全数値型が表示されることを確認

---

## 8. ロールバック計画

- 変更対象ファイルは3件のみ
- git で変更前の状態に戻すことで即座にロールバック可能

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-07 01:00
- **承認日時**: 2026-09-07 01:00
- **承認者コメント**: 承認します。

---

## 10. 実施記録

### 実施日時
開始: 2026-09-07 01:00
完了: 2026-09-07 01:00

### 最終的な成果物
- [x] ステップ1: `xsiTypeAttributes.ts` に `NUMERIC_PROPERTY_TYPES`（`MAIML_PROPERTY_TYPES.filter(isUnitAllowed)`）を追加エクスポート（Simple 11種 + List 11種 = 計22種）
- [x] ステップ2: `UncertaintyCreateModal.tsx` の `XSI_TYPE_OPTIONS`（3種）を廃止 → `NUMERIC_PROPERTY_TYPES` ベースの `XSI_TYPE_SELECT_OPTIONS`（グループ表示）に差し替え・units disabled 制御追加
- [x] ステップ3: `UncertaintyDetailModal.tsx` も同様に対応
- [x] ステップ4: `tsc --noEmit` によるコンパイルエラーゼロを確認
