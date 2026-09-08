# タスク計画書: 用語管理タブ 型選択肢拡充と単位制御

## メタデータ

- **作成日時**: 2026-09-07 00:00
- **タスクID**: 20260907_0000_用語管理タブ型選択肢拡充と単位制御
- **優先度**: 中
- **推定工数**: 2時間

---

## 1. タスク概要

名前空間管理画面の「用語管理タブ」（`TermManagement.tsx`）に以下の2点の問題がある。

1. **型選択肢が少ない**: 現状 6種類のみ（`stringType` / `intType` / `floatType` / `booleanType` / `dateTimeType` / `uriType`）で、MaiML編集画面（`NestedPropertyEditor.tsx`）で使用される全型（40種以上）と乖離している。
2. **単位入力に制御がない**: MaiML仕様上、`units` 属性は数値型にのみ許可されているが、現状は全ての型で単位（`unitHint`）を自由入力できてしまう。

---

## 2. 目的と期待される成果

- [ ] 用語管理タブの型選択肢を MaiML編集画面と同等の全型に拡充する
- [ ] `units` が許可されない型を選択した場合、単位入力欄を `disabled` にして自動クリアする
- [ ] 型定数の共通化により、今後の型追加時の保守コストを削減する

---

## 3. 現状調査結果

### 3-1. 現状の型選択肢（`TermManagement.tsx` の `TYPE_OPTIONS`）

```ts
const TYPE_OPTIONS = [
  { value: 'stringType',   label: 'stringType' },
  { value: 'intType',      label: 'intType' },
  { value: 'floatType',    label: 'floatType' },
  { value: 'booleanType',  label: 'booleanType' },
  { value: 'dateTimeType', label: 'dateTimeType' },
  { value: 'uriType',      label: 'uriType' },
];
```

→ **6種類のみ**

### 3-2. MaiML編集画面の型選択肢（`NestedPropertyEditor.tsx` の `MAIML_PROPERTY_TYPES`）

Simple Types 22種 + List Types 18種 = **計40種** が定義されている（ローカル定数）。

### 3-3. 単位許可型（`xsiTypeAttributes.ts` の `ALLOWED_ATTRIBUTES_BY_XSI_TYPE`）

`units` 属性が許可されるのは以下の数値型のみ:
- 数値 Simple: `decimalType`, `doubleType`, `floatType`, `intType`, `longType`, `shortType`, `byteType`, `unsignedIntType`, `unsignedLongType`, `unsignedShortType`, `unsignedByteType`
- 数値 List: 同上の `～ListType` 形式
- Content数値: `contentDoubleListType`, `contentFloatListType`, `contentIntListType`

`stringType`, `booleanType`, `dateTimeType`, `uriType` 等では `units` は **許可されない**。

---

## 4. 実装ステップ

### ステップ1: `xsiTypeAttributes.ts` に `MAIML_PROPERTY_TYPES` 共通定数を追加エクスポート

- [ ] `NestedPropertyEditor.tsx` のローカル定数 `MAIML_PROPERTY_TYPES` の内容を `xsiTypeAttributes.ts` に移動し `export` する
- [ ] 型定義: `Array<{ value: string; label: string; category: 'Simple' | 'List' }>` として export
- [ ] `MAIML_CONTENT_TYPES` も同様に export する（将来の流用に備えて）

### ステップ2: `NestedPropertyEditor.tsx` を共通定数参照に切り替え

- [ ] `xsiTypeAttributes.ts` から `MAIML_PROPERTY_TYPES`, `MAIML_CONTENT_TYPES` を import
- [ ] ローカルの `MAIML_PROPERTY_TYPES`, `MAIML_CONTENT_TYPES` 定義を削除

### ステップ3: `TermManagement.tsx` の型選択肢を全型対応に拡充

- [ ] `TYPE_OPTIONS` ローカル定数を削除
- [ ] `xsiTypeAttributes.ts` から `MAIML_PROPERTY_TYPES` を import
- [ ] テーブル列定義の型セレクト（新規行・編集行）を `MAIML_PROPERTY_TYPES` に差し替え
- [ ] フィルター用セレクト（`filterType`）も `MAIML_PROPERTY_TYPES` に差し替え
- [ ] `TYPE_COLOR` を拡充（追加型に対応する色マッピングを追加）

### ステップ4: `TermManagement.tsx` に単位入力制御を追加

- [ ] `xsiTypeAttributes.ts` の `getAllowedAttributeNames()` を import
- [ ] 単位許可判定ヘルパー関数 `isUnitAllowed(typeHint: string): boolean` を追加
- [ ] **新規行の単位列**: `typeHint` が単位不可型の場合、`Input` を `disabled` にする
- [ ] **新規行の型変更時**: 単位不可型に切り替えた際に `unitHint` を自動クリア
- [ ] **編集行の単位列**: `editingValues.typeHint` が単位不可型の場合、`Input` を `disabled` にする
- [ ] **編集行の型変更時**: 単位不可型に切り替えた際に `editingValues.unitHint` を自動クリア
- [ ] disabled 時のプレースホルダーを変更（「単位なし」等）

### ステップ5: i18n メッセージの追加

- [ ] `ja.json` に `termManagement.unitNotApplicable` キーを追加（値: 「-（このタイプは単位なし）」）
- [ ] `en.json` に `termManagement.unitNotApplicable` キーを追加（値: `"- (no unit for this type)"`）

### ステップ6: 動作確認

- [ ] TypeScript コンパイルエラーがないことを確認
- [ ] 新規行で型を「stringType」に設定すると単位欄が disabled になることを確認
- [ ] 新規行で型を「doubleType」に設定すると単位欄が有効になることを確認
- [ ] 型変更時に既入力の単位値が自動クリアされることを確認
- [ ] 編集行で同様の動作を確認
- [ ] フィルタ用セレクトに全型が表示されることを確認

---

## 5. 影響範囲の分析

| ファイル | 変更内容 | 影響 |
|---------|---------|------|
| `frontend/src/utils/xsiTypeAttributes.ts` | `MAIML_PROPERTY_TYPES` / `MAIML_CONTENT_TYPES` を追加エクスポート | 低（既存 export は変更なし） |
| `frontend/src/components/editorv2/NestedPropertyEditor.tsx` | ローカル定数を import に差し替え | 低（挙動変更なし） |
| `frontend/src/components/namespace/TermManagement.tsx` | 型選択肢拡充 + 単位制御追加 | 中（UI変更） |
| `frontend/src/locales/ja.json` | メッセージキー追加 | 低（既存キー変更なし） |
| `frontend/src/locales/en.json` | メッセージキー追加 | 低（既存キー変更なし） |

### セキュリティ・認証への影響
- なし（フロントエンドのUI制御のみ）

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `MAIML_PROPERTY_TYPES` の移動で `NestedPropertyEditor.tsx` の挙動が変わる | 低 | 低 | import先の定数内容を完全一致させる |
| 既存の `unitHint` 値が自動クリアされることでDBと不整合が起きる | 中 | 低 | クリアは編集操作中のステート変更のみ（保存を押すまで適用されない） |
| 型選択肢が増えすぎてUI上見づらくなる | 低 | 中 | Ant Design の `Select` に `optionGroupLabel`（グループ表示）を適用検討 |

---

## 7. テスト計画

### 手動テスト

- [ ] 用語管理タブを開き、「用語を追加」で新規行を追加する
- [ ] 型セレクトに `doubleType`, `longType`, `propertyListType` 等が選択できることを確認
- [ ] `stringType` 選択時: 単位欄が disabled（入力不可）になることを確認
- [ ] `doubleType` 選択時: 単位欄が enabled（入力可）になることを確認
- [ ] `stringType` → `intType` → `stringType` と切り替えた際、単位値が都度クリアされることを確認
- [ ] 既存行の編集で同様の動作を確認
- [ ] フィルター用型セレクトに全型が表示されることを確認

---

## 8. ロールバック計画

- 変更対象ファイルは5件のみ
- git で変更前の状態に戻すことで即座にロールバック可能

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-07 00:00
- **承認日時**: 2026-09-07 00:00
- **承認者コメント**: 承認します。

---

## 10. 実施記録

### 実施日時
開始: 2026-09-07 00:00
完了: 2026-09-07 00:00

### 最終的な成果物
- [x] ステップ1: `xsiTypeAttributes.ts` に `MaimlPropertyTypeOption` 型 / `MAIML_PROPERTY_TYPES` / `MAIML_CONTENT_TYPES` / `isUnitAllowed()` を追加エクスポート
- [x] ステップ2: `NestedPropertyEditor.tsx` のローカル定数を import に差し替え（挙動変更なし）
- [x] ステップ3: `TermManagement.tsx` の `TYPE_OPTIONS` を廃止し `MAIML_PROPERTY_TYPES` ベースの `TYPE_SELECT_OPTIONS`（グループ表示）・`TYPE_FILTER_OPTIONS` に置き換え。`TYPE_COLOR` を全型対応に拡充
- [x] ステップ4: 単位入力制御を追加（新規行・編集行とも `isUnitAllowed()` で disabled / 自動クリア）
- [x] ステップ5: `ja.json` / `en.json` に `termManagement.unitNotApplicable` キーを追加
- [x] ステップ6: `tsc --noEmit` によるコンパイルエラーゼロを確認
