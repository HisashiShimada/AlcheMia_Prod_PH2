# タスク計画書: viewer ダイアログコンポーネント 多言語対応漏れ修正

## メタデータ
- **作成日時**: 2026-09-18 10:00
- **タスクID**: 20260918_1000
- **優先度**: 中
- **推定工数**: 2時間

## タスク概要
`frontend/src/components/viewer/dialogs/` 配下の以下4コンポーネントにおいて、
ユーザー向け表示文字列がハードコードされており、多言語対応（`useLanguage` / `t()`）が適用されていない。
これを `ja.json` / `en.json` への翻訳キー追加 + `useLanguage` フック導入で修正する。

対象コンポーネント:
- `PropertyViewer.tsx`
- `PropertyViewerWithSelection.tsx`
- `StructuredPropertySelector.tsx`
- `SubNetViewer.tsx`

## 目的と期待される成果
- [ ] 4コンポーネントのすべての表示文字列を `t()` 翻訳キー経由に変更
- [ ] `ja.json` / `en.json` に新規キーを追加（`viewer.propertyViewer.*`、`viewer.structuredPropertySelector.*`、`viewer.subNetViewer.*`）

## 実装ステップ

### STEP 1: 翻訳キー設計・ja.json / en.json 追加
- [ ] `viewer` セクション配下に新規サブセクションを追加
  - `viewer.propertyViewer.*`: PropertyViewer / PropertyViewerWithSelection 共通キー
  - `viewer.structuredPropertySelector.*`: StructuredPropertySelector 用キー
  - `viewer.subNetViewer.*`: SubNetViewer 固有キー

### STEP 2: PropertyViewer.tsx 修正
- [ ] `useLanguage` import・`const { t } = useLanguage()` 追加
- [ ] ハードコード文字列をすべて `t('viewer.propertyViewer.*')` に置換

### STEP 3: PropertyViewerWithSelection.tsx 修正
- [ ] `useLanguage` import・`const { t } = useLanguage()` 追加
- [ ] ハードコード文字列をすべて `t('viewer.propertyViewer.*')` に置換（PropertyViewer と同一キー共有）

### STEP 4: StructuredPropertySelector.tsx 修正
- [ ] `useLanguage` import・`const { t } = useLanguage()` 追加
- [ ] ハードコード文字列をすべて `t('viewer.structuredPropertySelector.*')` に置換

### STEP 5: SubNetViewer.tsx 修正
- [ ] `useLanguage` import・`const { t } = useLanguage()` 追加
- [ ] ハードコード文字列をすべて `t('viewer.subNetViewer.*')` に置換

### STEP 6: 確認
- [ ] TypeScript コンパイルエラーがないこと確認

## 変更ファイル
1. `frontend/src/locales/ja.json` - 翻訳キー追加
2. `frontend/src/locales/en.json` - 翻訳キー追加（英語）
3. `frontend/src/components/viewer/dialogs/PropertyViewer.tsx` - useLanguage 適用
4. `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx` - useLanguage 適用
5. `frontend/src/components/viewer/dialogs/StructuredPropertySelector.tsx` - useLanguage 適用
6. `frontend/src/components/viewer/dialogs/SubNetViewer.tsx` - useLanguage 適用

## リスク
| リスク | 対策 |
|--------|------|
| 翻訳キー命名の不統一 | PropertyViewer/PropertyViewerWithSelection は同一キーを共有して一貫性を保つ |
| SubNetViewer の `alert()` 内文字列 | `t()` で対応 |

## 承認記録
- **承認日時**: 2026-09-18 10:00（ユーザー指示により即時実施）
- **作業完了**: 2026-09-18 10:30

## 実施記録

### 完了した作業
- [x] `ja.json` に `viewer.propertyViewer.*`、`viewer.propertyKeyMap.*`、`viewer.structuredPropertySelector.*`、`viewer.subNetViewer.*` キー追加
- [x] `en.json` に英語訳を追加
- [x] `PropertyViewer.tsx` に `useLanguage` 導入・全日本語表示文字列を `t()` に置換
- [x] `PropertyViewerWithSelection.tsx` に `useLanguage` 導入・全日本語表示文字列を `t()` に置換
- [x] `StructuredPropertySelector.tsx` に `useLanguage` 導入・全日本語表示文字列を `t()` に置換
- [x] `SubNetViewer.tsx` に `useLanguage` 導入・全日本語表示文字列を `t()` に置換
- [x] TypeScript コンパイルエラーなし確認
- [x] JSON整合性確認
