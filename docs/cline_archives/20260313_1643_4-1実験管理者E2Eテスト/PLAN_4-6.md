# タスク計画書: [4-6] 進捗確認・タスク結果 E2Eテスト

## メタデータ
- **作成日時**: 2026-03-13 18:48
- **タスクID**: e2e-4-6-progress-monitoring
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要

実験管理者の「進捗確認・タスク結果」機能（テストグループ4-6）に対するE2Eテストを作成する。
playwright-bdd（Gherkin形式）を使用し、featureファイルとstepsファイルを作成する。

対象シナリオ数: **13件**（全件 Playwright 自動化）

---

## 目的と期待される成果

### 目的
- 4-6グループ（進捗確認・タスク結果）の13シナリオをPlaywrightで自動化する
- 進捗確認タブのプロジェクト一覧表示、詳細ダイアログ（WorkProgressDetailDialog）の各機能、タスク結果タブの統計・一括完了を網羅する

### 期待される成果
- [x] タスク計画書（本ファイル）作成
- [ ] フロントエンドファイルへの `data-testid` 追加（3ファイル）
- [ ] featureファイル作成（`4-6_progress_monitoring.feature`）
- [ ] stepsファイル作成（`4-6_progress_monitoring.ts`）

---

## 対象シナリオ一覧

| シナリオID | シナリオ名 | 種別 | 対応API |
|-----------|-----------|------|---------|
| 4-6-1 | 進捗確認タブでプロジェクト一覧が表示されること | 正常系 | GET `/api/v1/projects` |
| 4-6-2-1 | 詳細ボタンをクリックすると「プロジェクト進捗詳細」モーダルが表示されること | 正常系 | - |
| 4-6-2-2 | 詳細ダイアログにプロジェクト情報が表示されること | 表示確認 | - |
| 4-6-2-3 | 複数メソッド時はメソッドフィルタが表示され、単一メソッド時は非表示であること | 表示確認 | - |
| 4-6-2-4 | タスクタブ切り替えで各タスクの詳細とトランジションサマリーが切り替わること | 正常系 | - |
| 4-6-2-5 | 詳細ダイアログにトランジション詳細一覧が表示されること | 表示確認 | - |
| 4-6-2-6 | 「再読み込み」ボタンをクリックするとデータが再取得されること | 正常系 | - |
| 4-6-2-7 | 「閉じる」ボタンをクリックするとモーダルが閉じること | 正常系 | - |
| 4-6-3 | タスク結果タブでタスク統計（件数）が表示されること | 表示確認 | GET `/api/v1/projects/:projectName/tasks` |
| 4-6-4 | レビュー待ちタスクを一括完了できること | 正常系 | POST `/api/v1/projects/:projectName/tasks/complete-review` |

---

## 実装ステップ

### Phase 1: フロントエンドへの data-testid 追加

- [ ] `frontend/src/components/progress/ProgressMonitoring.tsx`
  - `data-testid="progress-project-list-table"` をテーブルに追加
  - `data-testid="progress-detail-button-{projectId}"` を詳細ボタンに追加
- [ ] `frontend/src/components/progress/WorkProgressDetailDialog.tsx`
  - `data-testid="progress-detail-dialog"` をModal本体に追加
  - `data-testid="progress-detail-project-name"` をプロジェクト名表示に追加
  - `data-testid="progress-detail-project-status"` をステータスTagに追加
  - `data-testid="progress-detail-method-filter"` をメソッドフィルタSelectに追加
  - `data-testid="progress-detail-task-tabs"` をTabsコンポーネントに追加
  - `data-testid="progress-detail-transition-summary"` をトランジションサマリーCardに追加
  - `data-testid="progress-detail-transition-list"` をトランジション詳細一覧に追加
  - `data-testid="progress-detail-reload-button"` を再読み込みボタンに追加
  - `data-testid="progress-detail-close-button"` を閉じるボタンに追加
- [ ] `frontend/src/components/project/TaskResultsTable.tsx`
  - `data-testid="task-results-table"` をTableに追加
  - `data-testid="task-results-complete-review-button"` を一括完了ボタンに追加（親コンポーネント確認が必要）

### Phase 2: featureファイル作成
- [ ] `tests/e2e/features/4_experiment_admin/4-6_progress_monitoring.feature` を作成
  - 背景（Background）: 実験管理者ユーザーがDBに存在する
  - 4-6-1〜4-6-4の10シナリオを記述
  - 各シナリオに `@4-6-X` タグを付与

### Phase 3: stepsファイル作成
- [ ] `tests/e2e/steps/4_experiment_admin/4-6_progress_monitoring.ts` を作成
  - Before フック（シナリオ別テストデータ準備）
  - After フック（クリーンアップ）
  - AfterAll（DB接続クローズ）
  - Given/When/Then ステップ定義

---

## 変更ファイル一覧

### 新規作成
1. `docs/20260313_1643_4-1実験管理者E2Eテスト/PLAN_4-6.md`（本ファイル）
2. `tests/e2e/features/4_experiment_admin/4-6_progress_monitoring.feature`
3. `tests/e2e/steps/4_experiment_admin/4-6_progress_monitoring.ts`

### 修正
1. `frontend/src/components/progress/ProgressMonitoring.tsx` - data-testid追加
2. `frontend/src/components/progress/WorkProgressDetailDialog.tsx` - data-testid追加
3. `frontend/src/components/project/TaskResultsTable.tsx` - data-testid追加（一括完了ボタン等）

---

## テストデータ設計

### 4-6-1（プロジェクト一覧表示）
- `project` テーブルにテスト用プロジェクトが1件以上存在すること

### 4-6-2-1〜4-6-2-7（詳細ダイアログ）
- テスト用プロジェクト: `project_status=2(in_progress)`, `checkout_status=0(checked_in)`
- `project_task` テーブルに1件以上のタスクが存在すること
- `transition_set` テーブルに1件以上のトランジション進捗が存在すること
  - 各ステータス（完了・作業中・未着手）のトランジションが存在すること
- MAIMLファイルがS3に存在すること（ProgressMonitoring経由でファイルを取得するため）

### 4-6-2-3（メソッドフィルタ確認）
- 複数メソッド（2種類以上）を持つプロジェクトが存在すること
- `project_task` テーブルに異なるmethod_idのタスクが2件以上存在すること

### 4-6-3（タスク統計表示）
- `project_task` テーブルに各ステータスのレコードが存在すること
  - `task_status=0(pending)` が1件以上
  - `task_status=2(in_progress)` が1件以上
  - `task_status=3(review_waiting)` が1件以上

### 4-6-4（一括完了）
- `project_task` テーブルに `task_status=3(review_waiting)` のレコードが1件以上存在すること

---

## 前提条件

- 実験管理者ロールでログイン済み
- `http://localhost:3000/?orgId={ORG_ID}` でアクセス可能
- PostgreSQL起動済み
- S3/Swift起動済み（詳細ダイアログはMAIMLファイルを取得するため）
- 実験管理者ユーザーが `organization_user` テーブルに存在すること

---

## 注意事項

### 詳細ダイアログ（WorkProgressDetailDialog）のデータ取得フロー
`ProgressMonitoring` で詳細ボタンをクリックすると：
1. `GET /api/v1/projects/:projectName/files` → MAIMLファイルを取得
2. `WorkProgressDetailDialog` 内で `GET /api/v1/progress/projects/:projectName/work-details` → 作業詳細を取得

このため、テスト用プロジェクトにはMAIMLファイルが必要。
→ S3/Swiftが起動していない環境では詳細ダイアログのテストが失敗する可能性がある。

### タスク結果タブの場所
`TaskResultsTable` は `ProjectManagement.tsx` 内の「タスク結果」タブに配置されている。
進捗確認画面（`ProgressMonitoring.tsx`）ではなく、プロジェクト管理タブ配下にある点に注意。

---

## 承認記録
- **計画書提示日時**: 2026-03-13 18:48
- **承認日時**: 2026-03-13 18:47
- **承認者コメント**: 承認済み（Act Modeへ切り替え済み）
