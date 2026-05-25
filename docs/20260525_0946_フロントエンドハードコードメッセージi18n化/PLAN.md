# タスク計画書: フロントエンドハードコードメッセージ i18n化

## メタデータ
- **作成日時**: 2026-05-25 09:46
- **タスクID**: frontend-hardcode-i18n
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

grepによるハードコード検出で発見されたフロントエンドの英語・日本語ハードコードメッセージ8件をi18n化する。
`t()` を使用せず文字列リテラルを直接 `message.xxx()` に渡している箇所を対象とする。

## 目的と期待される成果
- [ ] 英語ハードコード2件を日本語化・i18n化
- [ ] 日本語ハードコード6件をi18n化
- [ ] ja.json / en.json に不足キーを追加

## 対象箇所一覧

| # | ファイル | 行 | 現状 | 対応 |
|---|---|---|---|---|
| 1 | `ViewRenderer.tsx` | 466 | `'Failed to initialize editor'` (英語) | `t()` 化 ＋ キー追加 |
| 2 | `ViewRendererDialog.tsx` | 91 | `` `Failed to load file: ...` `` (英語) | `t()` 化 ＋ キー追加 |
| 3 | `CreateFormatFolderModal.tsx` | 52 | `'フォーマットが選択されていません'` | 既存キー `upload.noFormatSelected` を使用 |
| 4 | `DataRecordDialog.tsx` | 1099 | `` `添付ファイルのアップロードに失敗しました（insertion #${n}）` `` | `t()` 化 ＋ キー追加 |
| 5 | `DataRecordDialog.tsx` | 1145 | `` `ファイルのアップロードに失敗しました: ${key}` `` | `t()` 化 ＋ キー追加 |
| 6 | `DataRecordDialog.tsx` | 1806 | `` `${file.name}をアップロードします（未実装）` `` | `t()` 化 ＋ キー追加（未実装のTODOコメントは維持） |
| 7 | `DataRecordDialog.tsx` | 2454 | `` `更新に失敗しました: ${serverMessage}` `` | `t()` 化 ＋ キー追加 |
| 8 | `DataRecordDialog.tsx` | 2456 | `` `更新に失敗しました: ${axiosError.message}` `` | 同上（同一キー使用） |

※ `usePublishStatusPoller.ts:43` はJSDocコメント内のため対応不要。

## 実装ステップ

### Phase 1: ja.json / en.json にキーを追加
- [ ] `viewer` セクションに以下のキーを追加
  - `initializeEditorError`: "エディタの初期化に失敗しました" / "Failed to initialize editor"
  - `loadFileError`: "ファイルの読み込みに失敗しました" / "Failed to load file"
- [ ] `dataRecordDialog` セクションに以下のキーを追加
  - `attachmentUploadError`: "添付ファイルのアップロードに失敗しました（#{number}）" / "Failed to upload attachment (#{number})"
  - `fileUploadError`: "ファイルのアップロードに失敗しました: {key}" / "Failed to upload file: {key}"
  - `fileUploadNotImplemented`: "{name}をアップロードします（未実装）" / "Uploading {name} (not implemented)"
  - `updateError`: "更新に失敗しました: {message}" / "Failed to update: {message}"

### Phase 2: ViewRenderer.tsx 修正
- [ ] `useTranslation` のimportと初期化を追加
- [ ] 466行目を `t('viewer.initializeEditorError')` に変更

### Phase 3: ViewRendererDialog.tsx 修正
- [ ] `useTranslation` のimportと初期化を追加
- [ ] 91行目を `t('viewer.loadFileError')` に変更（エラー詳細は削除またはconsole.errorに留める）

### Phase 4: CreateFormatFolderModal.tsx 修正
- [ ] `useTranslation` のimportと初期化を確認
- [ ] 52行目を既存キー `t('upload.noFormatSelected')` に変更

### Phase 5: DataRecordDialog.tsx 修正
- [ ] 1099行目を `t('dataRecordDialog.attachmentUploadError', { number: insIdx + 1 })` に変更
- [ ] 1145行目を `t('dataRecordDialog.fileUploadError', { key: cp.key || cp.value })` に変更
- [ ] 1806行目を `t('dataRecordDialog.fileUploadNotImplemented', { name: file.name })` に変更
- [ ] 2454/2456行目を `t('dataRecordDialog.updateError', { message: serverMessage / axiosError.message })` に変更

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `frontend/src/locales/ja.json` | キー追加（viewer/dataRecordDialog セクション） |
| `frontend/src/locales/en.json` | キー追加（viewer/dataRecordDialog セクション） |
| `frontend/src/components/viewer/ViewRenderer.tsx` | useTranslation 追加、メッセージ差し替え |
| `frontend/src/components/viewer/ViewRendererDialog.tsx` | useTranslation 追加、メッセージ差し替え |
| `frontend/src/components/format/CreateFormatFolderModal.tsx` | メッセージ差し替え |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | メッセージ差し替え（5箇所） |

## リスク
| リスク | 対策 |
|---|---|
| DataRecordDialog は既に useTranslation 使用済みのため影響小 | 既存の `t` インスタンスをそのまま使用 |
| ViewRenderer/ViewRendererDialog は useTranslation 未使用 | importを追加するだけで影響なし |
| i18n変数展開（`{number}` 等）の記法ミス | 既存の `t()` 使用箇所の記法を参考にする |

## 承認記録
- **計画書提示日時**: 2026-05-25 09:46
- **承認日時**: 
- **承認者コメント**: 
