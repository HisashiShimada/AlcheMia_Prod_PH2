# リリースノート

**リリース日**: 2026-04-14  
**対象ブランチ**: main  
**前回リリースコミット**: `5b7c00dc6dea5ae854bc359b196db7f74c006301`  
**今回リリースコミット**: `551bd9253e092c9f762ff2efb7e58cf36984adfe`

---

## バグ修正

### 1. PetriNetEditor ノード削除バグ修正（PR #164）

- **接続エッジが残存するバグ修正**: PropertyPanel からノードを削除した際、そのノードに接続されていたエッジが削除されずに残存するバグを修正
- **テンプレート placeRef 紐づきが解除されないバグ修正**: ノード削除時に、テンプレートの `placeRef` 紐づきが解除されないバグを修正

### 2. project_uuid 未更新バグ修正（PR #169）

- **MAIML 保存時に `project.project_uuid` が更新されないバグ修正**: `extractDocumentUuid` 関数が XML 属性を参照していたため常に `null` を返していた実装を、`MaimlParserTyped` を使用して子要素 `<uuid>` を正しく取得するよう修正
- **`file_metadata.project_uuid` が上書き保存時に更新されないバグ修正**: `ON CONFLICT DO NOTHING` により既存レコードの `project_uuid` が更新されなかった問題を修正。MAIML メインファイルの保存時は `UPDATE` で強制上書きするよう対応

### 3. projectId / projectName 混同バグ修正（PR #169）

バックエンド API が `/:projectName` → `/:projectId`（UUID）に移行された際、フロントエンド側の修正が不完全だった箇所を一括修正。

| 修正箇所 | 内容 |
|---------|------|
| `ProjectManagement.tsx` | `getProjectFiles` / `getProjectTasks` の引数を `.name` → `.id`（UUID）に変更（9 箇所） |
| `TaskRegistrationTab.tsx` | `getInstructions` / `getTaskRegistration` / `saveTaskRegistration` の引数を UUID に変更 |
| `InstructionRegistrationTab.tsx` | `getTaskRegistration` / `getInstructions` の引数を UUID に変更 |
| `ProgressMonitoring.tsx` | `getProjectFiles` の引数を `record.projectName` → `record.projectId` に変更 |
| `ExperimentRecordTab.tsx` / `DataRecordDialog.tsx` | S3 パス構築に使用するプロジェクト名の取得方法を修正 |
| `ProgressCheckTab.tsx` | `selectedProjectName` を子コンポーネントへ正しく受け渡すよう修正 |

### 4. サブフォルダ内ファイルが表示されないバグ修正（PR #169）

- **根本原因**: `handleFolderClick` がフォルダ ID（`folder_rawdata` 形式）をそのまま `currentFolder` にセットしていたため、`subFolderFiles` のキー（`rawdata`）と不一致になりファイルが表示されなかった
- **修正内容**: `handleFolderClick` 内で `folder_` プレフィックスを除去してからフォルダ名を `currentFolder` にセットするよう修正

---

## 新機能・改善

### 5. プロジェクト名変更機能 renameProject 追加（改善仕様書 No.2）（PR #167）

前回リリース（2026-04-13）のプロジェクト名変更機能に関して、不足していた対応を追加。

- バックエンドの `renameService` に関連するルート・サービスの連携処理を補完
- フロントエンドの `projectApiService.ts` に `renameProject()` を追加し、プロジェクト名変更フローを完成

### 6. 多言語化対応（改善仕様書 No.17a）（PR #164 / #170）

- フロントエンド全体の多言語化対応を実装
- PR #170 にてビルドエラーを修正し、正常にビルド可能な状態に対応

---

## DB マイグレーション

| ファイル | 内容 |
|---------|------|
| `20260413_add_project_uuid_to_project_and_file_metadata.sql` | `project` テーブルおよび `file_metadata` テーブルに `project_uuid` カラムを追加 |
| `20260414_add_unique_constraint_project_uuid.sql` | `project` テーブルの `project_uuid` カラムにユニーク制約を追加 |

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/services/maimlService.ts` | `MaimlParserTyped` インポート追加、`extractDocumentUuid` 実装修正（子要素 `<uuid>` 取得） |
| `backend/src/services/storageService.ts` | `uploadFile` で `project_uuid` を `updateFileMetadata` により強制上書きする処理を追加 |
| `backend/src/services/fileAccessService.ts` | `.maiml` ファイルアップロード時に UUID 抽出し `project_uuid` を付与する処理を追加 |
| `backend/migrations/20260413_add_project_uuid_to_project_and_file_metadata.sql`（新規） | `project_uuid` カラム追加 |
| `backend/migrations/20260414_add_unique_constraint_project_uuid.sql`（新規） | `project_uuid` ユニーク制約追加 |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/components/project/ProjectManagement.tsx` | getProjectFiles / getProjectTasks の引数を UUID に変更（9 箇所）、`handleFolderClick` のサブフォルダプレフィックス除去修正 |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | getInstructions / getTaskRegistration / saveTaskRegistration の引数を UUID に変更 |
| `frontend/src/components/project/InstructionRegistrationTab.tsx` | getTaskRegistration / getInstructions の引数を UUID に変更 |
| `frontend/src/components/progress/ProgressMonitoring.tsx` | getProjectFiles の引数を projectId（UUID）に変更 |
| `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | projectName prop の取得方法修正 |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | selectedProjectName の受け渡し修正 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | ノード削除時のエッジ残存・placeRef 解除漏れを修正 |
| `frontend/src/services/projectApiService.ts` | `renameProject()` 追加 |
