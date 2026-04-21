# タスク計画書: フォルダ削除機能追加

## メタデータ
- **作成日時**: 2026-04-20 11:03
- **タスクID**: folder-delete-feature
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要

`FileListTable.tsx` および `FormatFileListTable.tsx` において、現在ファイルの削除はできるがフォルダの削除ができない。フォルダ行にも削除ボタンを表示し、フォルダを再帰削除できるようにする。

## 現状分析

### FileListTable.tsx（プロジェクト管理画面）
- アクション列のレンダラーで `if (record.isFolder) return null;` → フォルダ行はボタン全非表示
- Props: `onDeleteFile?: (file: ProjectFile) => void`
- 親: `ProjectManagement.tsx` が `handleDeleteMaimlFile` を `onDeleteFile` に渡している

### FormatFileListTable.tsx（フォーマット管理画面）
- アクション列のレンダラーで `!record.isFolder ? (...) : null` → フォルダ行はボタン全非表示
- Props: `onDelete?: (file: FormatFileData) => void`
- 親: `FormatManagement.tsx` が `handleFileDelete` を `onDelete` に渡している

### バックエンド
- 単一ファイル削除: `DELETE /api/v1/files/delete` → `fileAccessController.deleteFile` → `fileAccessService.deleteFileByKey()`
- フォルダ再帰削除: `fileAccessService.deleteFolderRecursive()` が**既に実装済み**
- `storageService.deleteFolderRecursive()` も**既に実装済み**
- フォルダ削除専用APIエンドポイントは**未存在**

## 目的と期待される成果

- [ ] FileListTable でフォルダ行に削除ボタンが表示される
- [ ] FormatFileListTable でフォルダ行に削除ボタンが表示される
- [ ] 削除確認ダイアログが表示される（誤操作防止）
- [ ] フォルダ配下のファイルが再帰的に削除される
- [ ] 削除後にファイル一覧が更新される

## 実装ステップ

### Phase 1: バックエンド - フォルダ削除エンドポイント追加

- [ ] `backend/src/controllers/fileAccessController.ts` にフォルダ削除コントローラー関数 `deleteFolder` を追加
  - `req.body.folderPath` を受け取る
  - `service.deleteFolderRecursive(organizationId, folderPath)` を呼び出す
- [ ] `backend/src/routes/fileAccessRoutes.ts` にルート登録
  - `DELETE /api/v1/files/delete-folder`
  - バリデーション: `folderPath` 必須・文字列・1〜1024文字

### Phase 2: フロントエンド - APIサービス関数追加

- [ ] `frontend/src/services/fileAccessService.ts` に `deleteFolderByPath` 関数を追加
  - `DELETE /api/v1/files/delete-folder` を呼び出す
  - 引数: `folderPath: string`

### Phase 3: FileListTable.tsx の修正

- [ ] Props に `onDeleteFolder?: (file: ProjectFile) => void` を追加
- [ ] フォルダ行（`record.isFolder === true`）のアクション列に削除ボタンを表示
  - 「↑ 戻る」の疑似フォルダエントリ（`id === 'back'`）は除外
  - ボタン: `<Button danger icon={<DeleteOutlined />}>削除</Button>`
  - クリック時に `onDeleteFolder?.(record)` を呼ぶ

### Phase 4: FormatFileListTable.tsx の修正

- [ ] Props に `onDeleteFolder?: (file: FormatFileData) => void` を追加
- [ ] フォルダ行のアクション列に削除ボタンを表示
  - 「↑ 戻る」の疑似フォルダエントリ（`id === 'back'`）は除外
  - ボタン: `<Button danger icon={<DeleteOutlined />}>削除</Button>`
  - クリック時に `onDeleteFolder?.(record)` を呼ぶ

### Phase 5: ProjectManagement.tsx の修正

- [ ] `handleDeleteFolder` ハンドラを追加
  - `Modal.confirm` で確認ダイアログ表示（「このフォルダ内のファイルもすべて削除されます」など警告）
  - `deleteFolderByPath(file.path)` を呼ぶ
  - 成功後: `getProjectFiles` を再呼び出しして `projectFilesData` を更新
- [ ] `<FileListTable>` に `onDeleteFolder={handleDeleteFolder}` を渡す

### Phase 6: FormatManagement.tsx の修正

- [ ] `handleFolderDelete` ハンドラを追加
  - `modal.confirm` で確認ダイアログ表示
  - `deleteFolderByPath(file.path)` を呼ぶ
  - 成功後: `fetchFormatFiles` を再呼び出しして `formatFilesData` を更新
- [ ] `<FormatFileListTable>` に `onDeleteFolder={handleFolderDelete}` を渡す

### Phase 7: API仕様書の修正

- [ ] `docs/design/api/api_file_access.md` に `DELETE /api/v1/files/delete-folder` エンドポイントを追記
  - リクエストボディ: `folderPath`（必須・文字列・1〜1024文字）
  - レスポンス: 削除成功時の `deletedCount`
  - エラーコード: `E1003`（バリデーション）、`E4001`（サーバーエラー）、`E5015`（権限不足）

### Phase 8: UI仕様書の修正

- [ ] `docs/design/ui/experiment_admin/01_project_management/ui_file_list_table.md` を修正
  - フォルダ行のアクション列に削除ボタンが追加されることを記載
  - 「↑ 戻る」行には削除ボタンを表示しないことを記載
  - 削除確認ダイアログの仕様を記載
- [ ] `docs/design/ui/experiment_admin/02_format_management/ui_format_file_list_table.md` を修正
  - 同上（フォーマット管理画面版）

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `backend/src/controllers/fileAccessController.ts` | `deleteFolder` 関数を追加 |
| `backend/src/routes/fileAccessRoutes.ts` | `DELETE /api/v1/files/delete-folder` ルートを追加 |
| `frontend/src/services/fileAccessService.ts` | `deleteFolderByPath` 関数を追加 |
| `frontend/src/components/project/FileListTable.tsx` | `onDeleteFolder` prop 追加・フォルダ行に削除ボタン追加 |
| `frontend/src/components/project/FormatFileListTable.tsx` | `onDeleteFolder` prop 追加・フォルダ行に削除ボタン追加 |
| `frontend/src/components/project/ProjectManagement.tsx` | `handleDeleteFolder` ハンドラ追加・FileListTable に prop 渡す |
| `frontend/src/components/project/FormatManagement.tsx` | `handleFolderDelete` ハンドラ追加・FormatFileListTable に prop 渡す |
| `docs/design/api/api_file_access.md` | `DELETE /api/v1/files/delete-folder` エンドポイントを追記 |
| `docs/design/ui/experiment_admin/01_project_management/ui_file_list_table.md` | フォルダ行削除ボタン・確認ダイアログの仕様を追記 |
| `docs/design/ui/experiment_admin/02_format_management/ui_format_file_list_table.md` | 同上（フォーマット管理画面版） |

## 技術的詳細

### フォルダパスの扱い

- `ProjectFile.path` はストレージの相対パス（例: `projects/ProjectName/rawdata`）
- `FormatFileData.path` はストレージの相対パス（例: `formats/dept_001/chemistry`）
- バックエンドの `deleteFolderRecursive` はこの相対パス形式を受け付ける

### 「↑ 戻る」エントリの除外

- `FileListTable` では `id === 'back'` のエントリが存在する
- `FormatFileListTable` でも同様
- 削除ボタンはこれらのエントリには表示しない（`record.id === 'back'` で除外）

### 削除確認ダイアログのメッセージ案

```
タイトル: 「{フォルダ名}」を削除しますか？
内容: このフォルダ内のファイルもすべて削除されます。この操作は取り消せません。
OKボタン: 削除（danger）
キャンセルボタン: キャンセル
```

## リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 大量ファイル入りフォルダの削除に時間がかかる | 中 | 低 | ローディング状態を表示する |
| 誤ってフォルダを削除する | 高 | 中 | 確認ダイアログで警告メッセージを明示 |
| バックエンドのパス解釈のずれ | 中 | 低 | フォルダパスの末尾スラッシュ有無を統一する（バックエンドで正規化） |

## セキュリティ考慮事項

- `authMiddleware` は既存エンドポイントと同様に適用する
- `organization_id` は認証情報から自動取得（フロントエンドから送信しない）
- `folderPath` バリデーション: 必須・文字列・1〜1024文字

## テスト計画（手動確認）

- [ ] プロジェクト管理画面でサブフォルダ（例: rawdata）を削除できる
- [ ] フォルダ削除後にファイル一覧が更新される
- [ ] 「↑ 戻る」行に削除ボタンが表示されない
- [ ] フォーマット管理画面でサブフォルダを削除できる
- [ ] フォルダ削除の確認ダイアログが表示される

## 承認記録

- **計画書提示日時**: 2026-04-20 11:03
- **承認日時**: （承認後に記入）
- **承認者コメント**: （承認後に記入）
