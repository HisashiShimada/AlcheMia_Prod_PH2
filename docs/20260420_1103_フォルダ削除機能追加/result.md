# 実施結果: フォルダ削除機能追加

## メタデータ
- **完了日時**: 2026-04-20 15:00
- **タスクID**: フォルダ削除機能追加
- **実施者**: Cline（2セッション）

---

## 実施概要

プロジェクト管理画面・フォーマット管理画面でフォルダを削除できる機能を追加した。
また実装後の動作確認で発覚したバグを2件修正した。

---

## 実装内容

### Phase 1〜5（別セッション）

| ファイル | 変更内容 |
|----------|----------|
| `backend/src/controllers/fileAccessController.ts` | `deleteFolder` 関数を追加 |
| `backend/src/routes/fileAccessRoutes.ts` | `DELETE /api/v1/files/delete-folder` ルートを追加 |
| `frontend/src/services/fileAccessService.ts` | `deleteFolderByPath` 関数を追加 |
| `frontend/src/components/project/FileListTable.tsx` | `onDeleteFolder` prop 追加・フォルダ行に削除ボタン追加 |
| `frontend/src/components/project/FormatFileListTable.tsx` | `onDeleteFolder` prop 追加・フォルダ行に削除ボタン追加 |

### Phase 6（別セッション）

| ファイル | 変更内容 |
|----------|----------|
| `frontend/src/components/project/ProjectManagement.tsx` | `handleDeleteFolder` ハンドラ追加・FileListTable に prop 渡す |
| `frontend/src/components/project/FormatManagement.tsx` | `handleFolderDelete` ハンドラ追加・FormatFileListTable に prop 渡す |

### Phase 7〜8（別セッション）

| ファイル | 変更内容 |
|----------|----------|
| `docs/design/api/api_file_access.md` | `DELETE /api/v1/files/delete-folder` エンドポイントを追記 |
| `docs/design/ui/experiment_admin/01_project_management/ui_file_list_table.md` | フォルダ行削除ボタン・確認ダイアログの仕様を追記 |
| `docs/design/ui/experiment_admin/02_format_management/ui_format_file_list_table.md` | 同上（フォーマット管理画面版） |

### 追加実装（本セッション）

| ファイル | 変更内容 |
|----------|----------|
| `backend/src/repositories/fileMetadataRepository.ts` | `findProjectUuidsByFileKeys()` メソッドを追加 |
| `backend/src/repositories/projectRepository.ts` | `updateMaimlFlgByUuid()` メソッドを追加 |
| `backend/src/services/fileAccessService.ts` | `deleteFolderRecursive()` にproject_maiml_flg更新ロジックを追加 |

---

## バグ修正（本セッション）

### バグ1: フォーマット管理でフォルダ削除が動作しない

**原因:** `backend/src/services/formatService.ts` の `getFormatFiles()` で、フォルダエントリの `path` フィールドに `subFolderName`（例: `rawdata`）のみがセットされていた。  
`deleteFolderByPath(file.path)` → `DELETE /api/v1/files/delete-folder` → `deleteFolderRecursive(organizationId, "rawdata")` と不正なパスが渡り、削除対象が見つからなかった。

**修正内容:** `path: subFolderName` → `path: subFolderFullPath`（例: `formats/dept_001/chemistry/rawdata`）に変更。2か所（ディレクトリマーカーを持つフォルダ、暗黙的フォルダの両方）を修正。

**修正ファイル:** `backend/src/services/formatService.ts`

---

### バグ2: 再帰フォルダ構造でファイルは消えるがフォルダが残る

**原因:** `backend/src/services/storageService.ts` の `deleteFolderRecursive()` 内で、キーが`/`で終わるフォルダマーカーオブジェクト（`application/directory`型の0バイトオブジェクト）をスキップする処理が入っていた。  
Swift/S3 ではフォルダはディレクトリマーカーオブジェクトとして存在するため、削除されずに残っていた。

**修正内容:** フォルダマーカースキップ処理（`if (file.key.endsWith('/')) continue;`）を削除。フォルダマーカー含むすべてのオブジェクトを削除対象とした。

**修正ファイル:** `backend/src/services/storageService.ts`

---

## 動作確認項目

- [x] フォーマット管理画面でサブフォルダ（例: rawdata）を削除できる
- [x] フォルダ削除の確認ダイアログが表示される
- [x] フォルダ削除後にファイル一覧が更新される
- [x] 「↑ 戻る」行に削除ボタンが表示されない
- [x] 再帰フォルダ構造でもフォルダマーカーが完全に削除される

---

## 変更ファイル一覧（全件）

| ファイル | 変更内容 |
|----------|----------|
| `backend/src/controllers/fileAccessController.ts` | `deleteFolder` 関数を追加 |
| `backend/src/routes/fileAccessRoutes.ts` | `DELETE /api/v1/files/delete-folder` ルートを追加 |
| `backend/src/services/fileAccessService.ts` | `deleteFolderRecursive()` にproject_maiml_flg更新ロジックを追加 |
| `backend/src/services/formatService.ts` | フォルダエントリの `path` を完全パスに修正 |
| `backend/src/services/storageService.ts` | `deleteFolderRecursive()` のフォルダマーカースキップを削除 |
| `backend/src/repositories/fileMetadataRepository.ts` | `findProjectUuidsByFileKeys()` を追加 |
| `backend/src/repositories/projectRepository.ts` | `updateMaimlFlgByUuid()` を追加 |
| `frontend/src/services/fileAccessService.ts` | `deleteFolderByPath()` を追加 |
| `frontend/src/components/project/FileListTable.tsx` | `onDeleteFolder` prop 追加・フォルダ行に削除ボタン追加 |
| `frontend/src/components/project/FormatFileListTable.tsx` | `onDeleteFolder` prop 追加・フォルダ行に削除ボタン追加 |
| `frontend/src/components/project/ProjectManagement.tsx` | `handleDeleteFolder` ハンドラ追加 |
| `frontend/src/components/project/FormatManagement.tsx` | `handleFolderDelete` ハンドラ追加 |
| `docs/design/api/api_file_access.md` | `DELETE /api/v1/files/delete-folder` エンドポイントを追記 |
| `docs/design/ui/experiment_admin/01_project_management/ui_file_list_table.md` | フォルダ行削除ボタン・確認ダイアログの仕様を追記 |
| `docs/design/ui/experiment_admin/02_format_management/ui_format_file_list_table.md` | 同上（フォーマット管理画面版） |
