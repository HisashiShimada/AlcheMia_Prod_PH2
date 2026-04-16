# リリースノート

**リリース日**: 2026-04-16  
**対象ブランチ**: main  
**前回リリースコミット**: `eebf25356579d90a8aa84be0cb4a502f4c03e361`  
**今回リリースコミット**: `36b188118cd0fc6a54af6a9aae30dd70068e6875`

---

## バグ修正

### 1. 承認待ちで確認完了ボタン非活性

- **`InstructionConfirmationTab.tsx`**: プロジェクトステータスがハードコードで `null` になっていた問題を修正。`executing_task`（タスク実行中）以外のステータス（`waiting_task`、`waiting_approval`、`completed` 等）では確認完了ボタンを非活性にするよう対応
- **`InstructionGroup.tsx`**: タスク指示グループ・トランジション指示グループのヘッダーにも確認完了ボタンを追加
- **`ExperimentWorkerMenu.tsx`**: 選択中プロジェクトの `status` を `InstructionConfirmationTab` に Props として渡すよう修正

### 2. MAIMLパス生成処理の修正漏れ

バックエンドの各サービスで `projects/${projectName}/${projectName}.maiml` のようにプロジェクト名から直接パスを組み立てていた処理を `projectId` ベースに統一。

| 修正箇所 | 内容 |
|---------|------|
| `backend/src/utils/maimlPathResolver.ts`（新規作成） | `getMaimlFilePath` / `getMaimlArchivePath` / `getProjectFolderPath` をエクスポート。DBから `project_name` を取得してパスを生成するよう実装 |
| `backend/src/services/taskRegistrationService.ts` | `getMaimlFilePath` の引数を `projectName` → `projectId` に変更 |
| `backend/src/services/maimlWriterService.ts` | `getMaimlFilePath` / `getMaimlArchivePath` / `getProjectFolderPath` の引数を `projectName` → `projectId` に変更 |
| `backend/src/services/maimlPublishService.ts` | `getMaimlFilePath` の引数を `projectName` → `projectId` に変更 |
| `backend/src/services/experimentDataService.ts` | 実験データ取得・みなし進捗更新処理における直組み立てを `getMaimlFilePath` 呼び出しに変更 |
| `backend/src/routes/experimentRoutes.ts` | experiments系エンドポイントのパスパラメータを `:projectName` → `:projectId` に変更 |
| `backend/src/controllers/experimentController.ts` | `req.params.projectName` → `req.params.projectId` に変更 |
| `backend/src/sql/queries/projects/findByIdWithStatus.sql`（新規作成） | プロジェクトIDとステータスを含む取得クエリを追加 |
| `frontend/src/services/experimentDataApiService.ts` | 関数引数 `projectName` → `projectId` に変更し、URL構築を `projectId` 使用に対応 |
| `backend/src/controllers/progressController.ts` | JSDocコメント内 `:projectName` → `:projectId` に統一 |
| `backend/src/controllers/projectController.ts` | JSDocコメント内 `:projectName` → `:projectId` に統一（13箇所） |
| `backend/src/types/api.ts` | JSDocコメント内 `:projectName` → `:projectId` に統一（8箇所） |

### 3. projectId / projectName 混同バグ修正

バックエンド API が `/:projectName` → `/:projectId`（UUID）に移行された際、フロントエンド側の修正が不完全だった箇所を修正。

| 修正箇所 | 内容 |
|---------|------|
| `progress/WorkProgressDetailDialog.tsx` | projectId を使用するよう修正 |
| `progress/ProgressMonitoring.tsx` | `getProjectFiles` の引数を `record.projectName` → `record.projectId` に変更 |
| `project/ProjectManagement.tsx` | 関連APIの引数を UUID に変更 |
| `ExperimentWorker/DataRecordDialog.tsx` | projectId を正しく参照するよう修正 |
| `ExperimentWorker/ProgressCheckTab.tsx` | `selectedProjectName` の受け渡しを修正 |
| `ExperimentWorker/ProgressCheckTable.tsx` | projectId を正しく参照するよう修正 |
| `hooks/usePublishStatusPoller.ts` | projectId を正しく参照するよう修正 |
| `utils/apiClient.ts` | コメントおよび型定義を projectId ベースに統一 |
| `frontend/src/types/progress.ts` | projectId に関連するプロパティを追加 |
| `services/projectApiService.ts` | コメントを projectId ベースに統一 |

### 4. 承認依頼ボタン押下後、承認待ちにならない不具合修正

- **根本原因**: バックエンドの `projectService.requestApproval()` が `project_task` テーブルのタスクステータスは更新していたが、`project` テーブルの `project_status` を `3`（タスク結果レビュー待ち）に更新していなかった
- **`backend/src/services/projectService.ts`**: `requestApproval()` 内に `project.project_status = 3` への更新処理を追加
- **`frontend/src/components/menus/ExperimentWorkerMenu.tsx`**: 承認依頼後の `finally` ブロックでプロジェクト一覧を必ず再取得するよう修正

### 5. タイムゾーン設定の不具合修正

- `backend/.env` のタイムゾーン設定を正しい形式に修正

---

## インフラ・環境対応

### 6. [検証環境] CA証明書が存在しない件の修正対応

- **`aws/ecs-task-definition-alchemia-backend.json`**: ECS タスク定義を修正
- **`backend/src/services/certificateService.ts`**: CA証明書が存在しない場合の処理を修正

---

## DB マイグレーション

なし

---

## 主な変更ファイル（抜粋）

### バックエンド

| ファイル | 変更概要 |
|---------|---------|
| `backend/src/utils/maimlPathResolver.ts`（新規） | MAIMLパス生成ユーティリティ。projectId → project_name を DB から取得してパスを解決 |
| `backend/src/services/projectService.ts` | `requestApproval()` に `project.project_status = 3` への更新処理を追加 |
| `backend/src/services/taskRegistrationService.ts` | `getMaimlFilePath` の引数を `projectId` に変更 |
| `backend/src/services/maimlWriterService.ts` | MAIMLパス系関数の引数を `projectId` に変更 |
| `backend/src/services/maimlPublishService.ts` | `getMaimlFilePath` の引数を `projectId` に変更 |
| `backend/src/services/experimentDataService.ts` | MAIMLパス直組み立てを `getMaimlFilePath` 呼び出しに変更 |
| `backend/src/routes/experimentRoutes.ts` | エンドポイントパラメータを `:projectName` → `:projectId` に変更 |
| `backend/src/controllers/experimentController.ts` | `req.params.projectName` → `req.params.projectId` に変更 |
| `backend/src/controllers/progressController.ts` | JSDocコメント修正 |
| `backend/src/controllers/projectController.ts` | JSDocコメント修正（13箇所） |
| `backend/src/types/api.ts` | JSDocコメント修正（8箇所） |
| `backend/src/sql/queries/projects/findByIdWithStatus.sql`（新規） | プロジェクトIDと状態を含む取得クエリ |
| `backend/src/services/certificateService.ts` | CA証明書が存在しない場合の処理修正 |
| `aws/ecs-task-definition-alchemia-backend.json` | ECS タスク定義修正 |

### フロントエンド

| ファイル | 変更概要 |
|---------|---------|
| `frontend/src/components/ExperimentWorker/InstructionConfirmationTab.tsx` | projectStatus Props 追加、確認完了ボタン活性制御修正、ヘッダーボタン追加 |
| `frontend/src/components/ExperimentWorker/InstructionGroup.tsx` | タスク指示・トランジション指示グループヘッダーに確認完了ボタンを追加 |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | projectStatus を Props として渡す対応、承認依頼後の一覧再取得修正 |
| `frontend/src/components/progress/WorkProgressDetailDialog.tsx` | projectId を使用するよう修正 |
| `frontend/src/components/progress/ProgressMonitoring.tsx` | `getProjectFiles` の引数を projectId に変更 |
| `frontend/src/components/project/ProjectManagement.tsx` | 関連APIの引数を UUID に変更 |
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | projectId 参照修正 |
| `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | selectedProjectName 受け渡し修正 |
| `frontend/src/components/ExperimentWorker/ProgressCheckTable.tsx` | projectId 参照修正 |
| `frontend/src/hooks/usePublishStatusPoller.ts` | projectId 参照修正 |
| `frontend/src/utils/apiClient.ts` | コメント・型定義を projectId ベースに統一 |
| `frontend/src/types/progress.ts` | projectId 関連プロパティ追加 |
| `frontend/src/services/projectApiService.ts` | コメントを projectId ベースに統一 |
| `frontend/src/services/experimentDataApiService.ts` | 関数引数・URL構築を projectId ベースに変更 |
