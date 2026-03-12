# タスク計画書: api_progress_monitoring.md 仕様書修正

## メタデータ
- **作成日時**: 2026-03-12 14:09
- **タスクID**: api_progress_monitoring仕様書修正
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要

`docs/design/api/api_progress_monitoring.md` の「タスク関連API」（API #3, #4, #5）について、
実装済みソースコードを元に仕様書を修正する。

`API一覧_実験作業者画面.md` の「2. タスク関連API」に記載されている以下の3APIが対象：

| # | エンドポイント | 説明 |
|---|---|---|
| API #3 | GET `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/transitions` | 進捗データ取得 |
| API #4 | GET `/api/v1/progress/projects/:projectName/worker-tasks` | タスク一覧取得（実験作業者用） |
| API #5 | PATCH `/api/v1/progress/projects/:projectName/methods/:methodId/tasks/:taskNo/status` | タスクステータス更新 |

---

## 調査結果サマリー

### 調査ファイル

| ファイル | 役割 |
|---|---|
| `backend/src/controllers/progressController.ts` | コントローラー（getProgressData, getWorkerTasks, updateTaskStatus） |
| `backend/src/services/progressService.ts` | ProgressService（getProgressData, updateTransitionStatus, getWorkDetails） |
| `backend/src/services/taskService.ts` | TaskService（getTasksGroupedByMethod）、updateTaskStatus関数 |
| `backend/src/repositories/projectTaskRepository.ts` | findMethodsAndTasksByProject |
| `backend/src/routes/progressRoutes.ts` | ルート定義・ミドルウェアチェーン |
| `backend/src/types/task.ts` | TaskStatus, TaskFilters, MethodGroup, TaskSummary型 |
| `backend/src/types/taskService.types.ts` | TaskStatus, TaskStatusResponse型 |
| `backend/src/types/progress.ts` | TransitionProgress, ProgressData, OverallProgress型 |
| `backend/src/sql/queries/tasks/listMethodsAndTasksByProject.sql` | タスク一覧SQLクエリ |

### API #3: 進捗データ取得（GET .../transitions）

**実装状態**: 仕様書では🔴未実装 → 実際は✅実装済み

**実装ファイル**:
- コントローラー: `progressController.ts` - `getProgressData()`
- サービス: `progressService.ts` - `ProgressService.getProgressData()`
- リポジトリ: `transitionDataRepository.ts` - `getLatestRecordByTransition()`

**権限**: `checkPermission('050000', 0)` = experiment_worker 読取専用

**レスポンス差異（仕様書 vs 実装）**:

| 仕様書（現状） | 実装（実態） |
|---|---|
| `transitions[].status: "completed"` (文字列) | `transitions[].status: 5` (数値 0〜6) |
| `transitions[].progress: 45` | `transitions[].progress: 45` ✅ |
| `transitions[].last_updated: "..."` | `transitions[].last_updated: string \| null` ✅ |
| `task_no: "task-001"` (文字列) | `task_no: 1` (数値) |
| `overall_progress.in_progress` | `overall_progress.in_progress` ✅ |
| 各transitionに `material_count` 等なし | `material_count`, `material_actual_count`, `condition_count` 等あり |

ステータス数値の意味（TransitionStatusEnum）:
- 0: INITIAL（初期）
- 1: PREPARING（準備中）
- 2: READY（準備完了）
- 3: IN_PROGRESS（実行中）
- 4: PAUSED（一時停止）
- 5: COMPLETED（完了）
- 6: ERROR（エラー）

**実装アーキテクチャ**:
1. `progressController.getProgressData()` → `projects/findByName.sql` でプロジェクトID取得
2. `ProgressService.getProgressData(projectId, methodId, taskNo, organizationId)` 呼び出し
3. サービス内で `getTaskBasicInfo()` → `projectTaskRepository.getTaskByProjectMethodTaskNo()`
4. `downloadAndParseMAIML()` でMAIMLをダウンロード・パース
5. `getTransitionsProgress()` でPromise.all並列処理
6. 各トランジションで `transitionDataRepository.getLatestRecordByTransition()` + template_dataカウントSQL

### API #4: タスク一覧取得（GET .../worker-tasks）

**実装状態**: 仕様書では🔴未実装 → 実際は✅実装済み

**実装ファイル**:
- コントローラー: `progressController.ts` - `getWorkerTasks()`
- サービス: `taskService.ts` - `TaskService.getTasksGroupedByMethod()`
- リポジトリ: `projectTaskRepository.ts` - `findMethodsAndTasksByProject()`
- SQL: `tasks/listMethodsAndTasksByProject.sql`

**権限**: `checkPermission('050000', 0)` = experiment_worker 読取専用

**レスポンス差異（仕様書 vs 実装）**:

| 仕様書（現状） | 実装（実態：TaskSummary型） |
|---|---|
| `tasks[].status` | `tasks[].task_status` |
| `tasks[].experiment_user_id` | `tasks[].assign_user_id` |
| `tasks[].experiment_user_name` | `tasks[].assign_user_name` |
| `tasks[].progress` | `tasks[].progress_rate` |
| _(存在しない)_ | `tasks[].task_id` (string) |

**クエリパラメータ差異**:
- 実装では `assignedTo` → 内部で `assignUserId` にマッピング（仕様書のパラメータ名は正しい）
- `status` の有効値: ルート定義では `not_started, started, in_progress, completed, forced_terminated` だが、
  内部のstatusMapには `started` が含まれない（仕様書上は記載あり）

### API #5: タスクステータス更新（PATCH .../tasks/:taskNo/status）

**実装状態**: 仕様書では🔴未実装 → 実際は✅実装済み

**実装ファイル**:
- コントローラー: `progressController.ts` - `updateTaskStatus()`
- サービス: `taskService.ts` - `updateTaskStatus()` 関数
- SQL: `tasks/findByIdForUpdate.sql`, `tasks/updateStatus.sql`

**権限**: `checkPermission('050000', 1)` = experiment_worker 書込可

**リクエストボディ差異**:

| 仕様書（現状） | 実装（実態） |
|---|---|
| `currentUpdatedAt` optional | `currentUpdatedAt` **必須** (`.notEmpty()`) |
| ステータス: `started` を含む5種類 | `taskService.statusStringToNumber` に `started` なし → 実質4種類 |

**有効ステータス（実装）**:
- `not_started` (DB値: 0)
- `in_progress` (DB値: 1)
- `completed` (DB値: 3)
- `forced_terminated` (DB値: 4)

**ステータス遷移ルール（VALID_TRANSITIONS）**:
- `PENDING(0)` → `IN_PROGRESS(1)`, `FORCED_TERMINATED(4)`
- `IN_PROGRESS(1)` → `COMPLETED(3)`, `FORCED_TERMINATED(4)`
- `COMPLETED(3)` → 遷移不可
- `FORCED_TERMINATED(4)` → 遷移不可

**プロジェクト編集可能ステータス**:
- DB値 1 (pending/タスク実行待ち) または 2 (in_progress/タスク実行中) のみ編集可能

**レスポンス差異**:
- `previous_status`: 実装では `null` ハードコード（タスクの前ステータスは取得していない）

---

## 修正ステップ

### Phase 1: 実装状況サマリー更新
- [ ] API一覧テーブルの #3, #4, #5 を 🔴未実装 → 🟢実装済みに変更
- [ ] 実装状況サマリーの数値を更新（実装済み: 3→6、未実装: 3→0、完了率: 50%→100%）

### Phase 2: API #3 進捗データ取得の仕様書修正
- [ ] セクションヘッダーを 🔴 → 🟢 に変更
- [ ] 実装済みフラグを追加
- [ ] レスポンス仕様を実装に合わせて修正（transitions[].status を数値型に、フィールド追加）
- [ ] 実装要件を実際のアーキテクチャに書き換え

### Phase 3: API #4 タスク一覧取得の仕様書修正
- [ ] セクションヘッダーを 🔴 → 🟢 に変更
- [ ] 実装済みフラグを追加
- [ ] レスポンス仕様のフィールド名を実装に合わせて修正
- [ ] 実装要件を実際のアーキテクチャに書き換え

### Phase 4: API #5 タスクステータス更新の仕様書修正
- [ ] セクションヘッダーを 🔴 → 🟢 に変更
- [ ] 実装済みフラグを追加
- [ ] リクエストボディの `currentUpdatedAt` を必須に変更
- [ ] 有効ステータス一覧を実装に合わせて修正
- [ ] ステータス遷移ルールを実装に合わせて修正
- [ ] レスポンス仕様の `previous_status: null` を明記
- [ ] 実装要件を実際のアーキテクチャに書き換え

### Phase 5: 変更履歴追記
- [ ] バージョン 1.8.0 として変更履歴を追記

---

## 変更ファイル

1. `docs/design/api/api_progress_monitoring.md` - 上記修正

---

## 承認記録
- **計画書提示日時**: 2026-03-12 14:09
- **承認日時**: 2026-03-12 14:09
- **承認者コメント**: 修正作業はなるべく細かく分けて実行すること
