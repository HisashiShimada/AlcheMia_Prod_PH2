# タスク計画書: TemplateEditorDialog uploadTargetPath修正

## メタデータ
- **作成日時**: 2026-07-28 08:56
- **タスクID**: TemplateEditorDialog_uploadTargetPath修正
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要
`TemplateEditorDialog` にてエクスプローラーからのファイル選択・ドラッグアンドドロップでファイル設定した際に表示されるアップロード確認ダイアログのアップロード先パスが `editingFileName` から算出されているため、プロジェクト名とファイル名が異なる場合に誤ったS3パスになる。正しくは `sourceS3Key` から `projectName` を抽出してパスを構築すべき。

## 目的と期待される成果
- [ ] `sourceS3Key` から正しいプロジェクト名を抽出し `uploadTargetPath` を構築する
- [ ] `sourceS3Key` が存在しない場合は `editingFileName` でフォールバックする

## 実装ステップ
- [ ] `TemplateEditorDialog.tsx`: Propsに `sourceS3Key` を追加
- [ ] `TemplateEditorDialog.tsx`: `uploadTargetPath` 算出ロジックを `sourceS3Key` 優先・`editingFileName` フォールバックに修正
- [ ] `PetriNetEditorInner.tsx`: `<TemplateEditorDialog>` 呼び出しに `sourceS3Key={sourceS3Key}` を追加

## 変更ファイル
1. `frontend/src/components/editorv2/TemplateEditorDialog.tsx` - Props追加＋算出ロジック修正
2. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - sourceS3Key渡し追加

## 承認記録
- **承認日時**: 2026-07-28 08:56
