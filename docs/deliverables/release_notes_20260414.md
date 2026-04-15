# リリースノート

**リリース日**: 2026-04-14  
**対象ブランチ**: main  
**前回リリースコミット**: `5b7c00dc6dea5ae854bc359b196db7f74c006301`  
**今回リリースコミット**: `d89c11ee22536c4a78b93ecc973d921ca6477b60`

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

### 5. PropertyViewer の不具合対応（PR #171）

- **`PropertyViewer` / `PropertyViewerWithSelection`**: ダイアログ表示時の不具合を修正
- **`SubNetViewer`**: 表示処理の不具合を修正
- **`PetriNetViewer`**: 関連する呼び出し処理を修正

### 6. チャンク分割アップロードのキャンセル時ロールバック修正（PR #171）

- **race condition の解消**: キャンセルボタン押下と `complete` リクエスト到達が競合した際に、アップロード済みファイルがストレージに残ってしまう問題を修正。`complete` リクエスト処理後にキャンセル済みバッチを検出した場合、ストレージからファイルを削除して 409 を返すよう対応
- **`batchId` 紐付け不備の修正**: `completeChunkUpload` で `upload_batch_id` が毎回新規 UUID で生成されフロント側の `batchId` と不一致になっていた問題を修正。フロントから受け取った `batchId` を `effectiveBatchId` として使用するよう変更
- **全ファイルタイプを `file_metadata` に登録**: 従来 MAIML ファイルのみ `file_metadata` に保存していたため `cancelBatch` で削除対象が0件になっていた問題を修正。全ファイルタイプを登録対象とし `is_maiml_file` フラグで区別するよう変更
- **チャンクアップロード時の `project_uuid` 登録**: MAIML ファイルのチャンクアップロード完了時に `MaimlParserTyped` でパースして `project.project_uuid` および `file_metadata.project_uuid` を更新する処理を追加
- **エラーメッセージの改善**: 複数 MAIML ファイル選択時の警告メッセージをプロジェクト単位の制約であることが伝わる表現に変更

### 7. ECRデプロイ時 TypeScript ビルドエラー修正（PR #171）

- **`UnpublishJobData.projectId` をオプショナルに変更**: Docker ビルド時に `tsc` がエラーで失敗していた問題を修正

### 8. Redis 接続サービスのコード移植ミス修正（PR #171）

- **`redisConnectionService.ts`**: コード移植時のミスを修正

### 9. `crypto.randomUUID` が利用できない問題の修正（PR #171）

- **根本原因**: `crypto.randomUUID()` は Web Crypto API のメソッドであり、HTTPS（セキュアコンテキスト）環境でのみ利用可能。HTTP 環境や一部の SSR 環境では `undefined` となり `TypeError` が発生していた
- **対応**: `uuid` パッケージの `uuidv4()` に統一置換。対象ファイルは `documentInitializer.ts`、`documentParser.ts`、`OrganizationManagement.tsx`、`PropertyPanel.tsx`、`FormatEditorDialog.tsx`、`PetriNetEditorInner.tsx`（計6ファイル）

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
| `backend/src/controllers/fileAccessController.ts` | チャンクアップロードキャンセル時のrace condition対応・`effectiveBatchId` 統一・全ファイルタイプの `file_metadata` 登録・MAIML `project_uuid` 登録処理追加・複数MAIMLエラーメッセージ修正 |
| `backend/src/routes/fileAccessRoutes.ts` | チャンクアップロード関連ルートの追加 |
| `backend/src/services/chunkUploadService.ts` | チャンクアップロード処理の修正 |
| `backend/src/types/file.ts` | `ChunkUploadOptions` に `batchId` フィールド追加 |
| `backend/src/types/maimlOpenData.ts` | `UnpublishJobData.projectId` をオプショナルに変更 |
| `backend/src/services/redisConnectionService.ts` | コード移植ミス修正 |

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
| `frontend/src/components/viewer/PetriNetViewer.tsx` | PropertyViewer 呼び出し処理の修正 |
| `frontend/src/components/viewer/dialogs/PropertyViewer.tsx` | ダイアログ表示の不具合修正 |
| `frontend/src/components/viewer/dialogs/PropertyViewerWithSelection.tsx` | ダイアログ表示の不具合修正 |
| `frontend/src/components/viewer/dialogs/SubNetViewer.tsx` | 表示処理の不具合修正 |
| `frontend/src/services/fileAccessService.ts` | `batchId` を `uploadFileWithChunks` に伝播・`complete` リクエストに含める修正 |
| `frontend/src/components/project/BulkUploadDialog.tsx` | 複数 MAIML ファイル選択時の警告メッセージ修正 |
| `frontend/src/utils/documentInitializer.ts` | `crypto.randomUUID()` → `uuidv4()` 置換 |
| `frontend/src/utils/documentParser.ts` | `crypto.randomUUID()` → `uuidv4()` 置換 |
| `frontend/src/components/Provider/OrganizationManagement.tsx` | `crypto.randomUUID()` → `uuidv4()` 置換 |
| `frontend/src/components/editorv2/components/PropertyPanel.tsx` | `crypto.randomUUID()` → `uuidv4()` 置換 |
| `frontend/src/components/editorv2/components/FormatEditorDialog.tsx` | `crypto.randomUUID()` → `uuidv4()` 置換 |
