# タスク計画書: Insertion関連ファイルの多言語対応（i18n化）

## メタデータ
- **作成日時**: 2026-07-29 09:33
- **タスクID**: 20260729_0933_Insertion多言語対応
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`useInsertionEditor.ts` を起点に、Insertion関連コンポーネント全体のハードコード文言を多言語対応（i18n化）する。
`frontend/src/locales/ja.json` / `en.json` に新規セクション `insertionEditor` を追加し、
`useLanguage()` の `t()` を使って各文言をキー参照に置換する。

## 目的と期待される成果

- [ ] `useInsertionEditor.ts` 内のmessage.error / Modal.confirm文言がi18n化される
- [ ] `InsertionEditorForm.tsx` のラベル・placeholder・Tooltip文言がi18n化される
- [ ] `InsertionEditorCompact.tsx` のラベル・placeholder・Tooltip文言がi18n化される
- [ ] `WorkRecordPanel.tsx` のInsertion関連ボタン・ラベルがi18n化される
- [ ] ja.json / en.json に `insertionEditor` セクションが追加される

## 実装ステップ

### Phase 1: ロケールファイルへのキー追加
- [ ] `frontend/src/locales/ja.json` に `insertionEditor` セクション追加
- [ ] `frontend/src/locales/en.json` に `insertionEditor` セクション追加

### Phase 2: useInsertionEditor.ts のi18n化
- [ ] `useLanguage` を import し、`t()` を取得
- [ ] 7箇所のハードコード文言を `t()` に置換（パラメータ付き含む）

### Phase 3: InsertionEditorForm.tsx のi18n化
- [ ] `useLanguage` を import し、`t()` を取得
- [ ] DnDヒント・ラベル・placeholder・Tooltip・ボタン文言を `t()` に置換

### Phase 4: InsertionEditorCompact.tsx のi18n化
- [ ] `useLanguage` を import し、`t()` を取得
- [ ] DnDヒント・ラベル・placeholder・Tooltip文言を `t()` に置換

### Phase 5: WorkRecordPanel.tsx のInsertion関連i18n化
- [ ] `useLanguage` を新規import
- [ ] 「Insertion 追加」ボタン文言・「カスタム Insertion」ラベルを `t()` に置換

### Phase 6: 検証
- [ ] `scripts/check-i18n-keys.js` を実行してキー不整合・ハードコード漏れがないか確認

## 変更ファイル

1. `frontend/src/locales/ja.json` - insertionEditor セクション追加
2. `frontend/src/locales/en.json` - insertionEditor セクション追加
3. `frontend/src/hooks/useInsertionEditor.ts` - i18n化
4. `frontend/src/components/common/InsertionEditorForm.tsx` - i18n化
5. `frontend/src/components/common/InsertionEditorCompact.tsx` - i18n化
6. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - Insertion関連i18n化

## i18nキー設計

```json
"insertionEditor": {
  "fileSizeExceeded": "ファイルサイズが上限（{maxSize}）を超えています（{fileSize}）",
  "hashCalcFailed": "ハッシュ値の計算に失敗しました",
  "uploadConfirmTitle": "ファイルをサーバーにアップロードしますか？",
  "uploadConfirmOk": "アップロードする",
  "uploadConfirmCancel": "アップロードしない",
  "uploadSuccessNoKey": "アップロードは成功しましたが、S3キーを取得できませんでした",
  "uploadFailed": "ファイルのアップロードに失敗しました",
  "dropHintForm": "ここにドロップしてファイルを選択",
  "dropHintCompact": "ここにドロップ",
  "labelUri": "URI",
  "labelHashMethod": "Hash Method",
  "labelHashValue": "Hash Value",
  "labelFormat": "Format",
  "labelPreview": "プレビュー",
  "placeholderUri": "例: s3://bucket/path/to/file",
  "placeholderUriCompact": "URI",
  "placeholderHashMethod": "例: SHA-256",
  "placeholderHashMethodCompact": "SHA-256",
  "placeholderHashValue": "例: abc123...",
  "placeholderHashValueCompact": "ハッシュ値",
  "placeholderFormat": "例: application/xml",
  "placeholderFormatCompact": "例: application/xml",
  "selectFileButton": "ファイルを選択",
  "tooltipUploadWithS3": "ファイルを選択してS3にアップロード",
  "tooltipSelectOnly": "ファイルを選択して自動入力（アップロードなし）",
  "tooltipClear": "URI・ハッシュ・フォーマットをクリア",
  "addButton": "Insertion 追加",
  "customLabel": "カスタム Insertion"
}
```

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| WorkRecordPanel.tsx に useLanguage 追加による副作用 | 低 | 低 | Insertion関連箇所のみ変更、他の文言は触らない |
| パラメータ付きキー（fileSizeExceeded）の置換ミス | 中 | 低 | プレースホルダ `{maxSize}` `{fileSize}` を正しく渡すことを確認 |

## 承認記録
- **計画書提示日時**: 2026-07-29 09:33
- **承認日時**: （承認時に記入）
- **承認者コメント**:
