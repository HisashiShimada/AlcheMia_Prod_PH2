# タスク計画書: use_deemed_progress カラム・progress_rate カラム削除

## メタデータ
- **作成日時**: 2026-09-24 10:00
- **タスクID**: 20260924_1000_use_deemed_progress_progress_rate削除
- **優先度**: 中
- **推定工数**: 2〜3時間
- **前提タスク**: 20260911_1200_みなし進捗処理削除（フェーズ1・2 完了済み）

---

## タスク概要

みなし進捗処理削除（20260911_1200）の後続作業として、以下2つの不要カラムを削除する。

| 対象 | カラム名 | 削除理由 |
|------|---------|---------|
| `organization` テーブル | `use_deemed_progress` | みなし進捗処理が廃止され参照コードが不要になった |
| `transition_data` テーブル | `progress_rate` | みなし進捗廃止により更新不要・フロントエンド側の参照も削除済み |

---

## 目的と期待される成果

- [ ] `organization.use_deemed_progress` カラムをDBから削除し、関連するバックエンド・フロントエンドのコードをすべて整理する
- [ ] `transition_data.progress_rate` カラムをDBから削除し、関連するバックエンドコード（SQL・型・ロジック）をすべて整理する
- [ ] TypeScript コンパイルエラーが 0 件であることを確認する
- [ ] フロントエンドのビルドエラーが 0 件であることを確認する

---

## 影響範囲の事前調査結果

### A. `use_deemed_progress` の影響ファイル一覧

#### バックエンド
| ファイル | 変更内容 |
|---------|---------|
| `backend/src/repositories/organizationRepository.ts` | `OrganizationRow.use_deemed_progress` 削除、`getUseDeemedProgress` 関数削除 |
| `backend/src/repositories/organizationManagementRepository.ts` | `OrganizationRow.use_deemed_progress` 削除、`create` / `update` の引数型・パラメータ配列整理 |
| `backend/src/repositories/workerProjectRepository.ts` | `WorkerAccessibleProjectRow.use_deemed_progress` 削除 |
| `backend/src/services/organizationService.ts` | `OrganizationResponse.useDeemedProgress` 削除、マッピング・CSVバリデーション整理 |
| `backend/src/services/workerProjectService.ts` | `useDeemedProgress` マッピング削除 |
| `backend/src/types/workerProject.ts` | `WorkerAccessibleProject.useDeemedProgress` 削除 |
| `backend/src/controllers/organizationController.ts` | csvData から `use_deemed_progress` 削除 |
| `backend/src/utils/messages.ts` | `useDeemedProgressInvalid` キー削除（ja/en両方） |
| `backend/src/sql/queries/organizations/getUseDeemedProgress.sql` | ファイルごと削除 |
| `backend/src/sql/queries/organizations/findAll.sql` | SELECT から `o.use_deemed_progress` 削除 |
| `backend/src/sql/queries/organizations/findById.sql` | SELECT から `o.use_deemed_progress` 削除 |
| `backend/src/sql/queries/organizations/findByIdSimple.sql` | SELECT から `use_deemed_progress` 削除 |
| `backend/src/sql/queries/organizations/create.sql` | INSERT の列・VALUES から `use_deemed_progress` 削除、`$8`以降のパラメータ番号を詰め直し |
| `backend/src/sql/queries/organizations/update.sql` | SET 句から `use_deemed_progress` 削除、`$7`以降のパラメータ番号を詰め直し |
| `backend/src/sql/queries/projects/findWorkerAccessible.sql` | SELECT と `INNER JOIN organization` ごと削除（use_deemed_progress取得のみが目的のJOINのため） |
| `backend/scripts/test-maiml-publish-worker.ts` | INSERT から `use_deemed_progress` 削除 |

#### フロントエンド
| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/types/organization.ts` | `OrganizationData.useDeemedProgress` 削除 |
| `frontend/src/types/project.ts` | `WorkerProject.useDeemedProgress` 削除 |
| `frontend/src/components/Provider/OrganizationManagement.tsx` | `selectedUseDeemedProgress` state 削除、フィルタロジック削除、フィルターUI削除、フォーム項目（新規/編集）削除 |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `selectedProjectUseDeemedProgress` 変数削除、`WorkRecordPanel` prop 削除 |
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | `WorkRecordPanelProps.useDeemedProgress` 削除 |

#### テスト
| ファイル | 変更内容 |
|---------|---------|
| `tests/e2e/steps/5_experiment_worker/5-2_experiment_record.ts` | `use_deemed_progress` 操作コード削除 |
| `tests/e2e/steps/provider/1_provider.ts` | `use_deemed_progress` 操作コード削除 |

### B. `progress_rate` の影響ファイル一覧

#### バックエンド
| ファイル | 変更内容 |
|---------|---------|
| `backend/src/repositories/transitionDataRepository.ts` | `TransitionDataRow.progress_rate` / `TransitionDataUpdate.progress_rate` 削除、`updateStatus` / `insert` パラメータ配列整理 |
| `backend/src/services/progressService.ts` | `finalProgressRate` ロジック削除、`normalizeProgress` を status のみで判定するよう変更 |
| `backend/src/controllers/progressController.ts` | `progressRate` リクエスト変数 / `updateData` スプレッド / レスポンスの `progressRate` 削除 |
| `backend/src/types/transitionData.ts` | `progress_rate` フィールド削除 |
| `backend/src/types/database.ts` | `progress_rate` フィールド削除 |
| `backend/src/types/task.ts` | `progress_rate` フィールド削除 |
| `backend/src/types/api.ts` | `progressRate` フィールド削除 |
| `backend/src/repositories/eventLogRepository.ts` | `EventLogData.progress_rate` / INSERT ロジック削除 |
| `backend/src/repositories/projectTaskDetailRepository.ts` | `progressRate` マッピング削除 |
| `backend/src/services/taskService.ts` | `progress_rate: record.progress_rate` 削除 |
| `backend/src/sql/queries/transition_data/updateStatus.sql` | `progress_rate = $2` 削除、パラメータ番号詰め直し |
| `backend/src/sql/queries/transition_data/insert.sql` | `progress_rate` 削除 |
| `backend/src/sql/queries/transition_data/findById.sql` | SELECT から `progress_rate` 削除 |
| `backend/src/sql/queries/transition_data/findByTask.sql` | SELECT から `td.progress_rate` 削除 |
| `backend/src/sql/queries/transition_data/getLatestRecord.sql` | SELECT から `progress_rate` 削除 |
| `backend/src/sql/queries/transition_data/sumProgressRateByTask.sql` | ファイルごと削除 |
| `backend/src/sql/queries/project_tasks/updateProgressRate.sql` | ファイルごと削除 |
| `backend/src/sql/queries/tasks/listMethodsAndTasksByProject.sql` | `COALESCE(AVG(td.progress_rate), 0) AS progress_rate` と td LEFT JOIN を削除 |
| `backend/src/sql/queries/tasks/findDetailByTaskId.sql` | `avg_progress_rate` 関連削除 |
| `backend/src/sql/queries/tasks/findTransitionsByTaskId.sql` | `td.progress_rate` 削除 |

#### フロントエンド
| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/types/project.ts` | `WorkerTask.progress_rate` 削除 |
| `frontend/src/types/progress.ts` | `TransitionProgress.progressPercentage` 削除、`WorkDetail.progressPercentage` 削除 |
| `frontend/src/services/projectApiService.ts` | インライン型の `progress: number` 削除、マッピングの `progressPercentage: t.progress ?? 0` 削除 |

---

## 実装ステップ

### Step 1: DBマイグレーション SQL の作成

マイグレーション管理方式を確認した上で、以下のDDLを作成する。

- [ ] `organization` テーブルから `use_deemed_progress` カラムを削除する DDL
- [ ] `transition_data` テーブルから `progress_rate` カラムを削除する DDL

### Step 2: `use_deemed_progress` 関連コードの削除（バックエンド）

- [x] SQL ファイルの修正（findAll / findById / findByIdSimple / create / update）
- [x] `findWorkerAccessible.sql` から `organization.use_deemed_progress` と JOIN ごと削除
- [x] `getUseDeemedProgress.sql` ファイルを削除
- [x] `organizationRepository.ts`: `OrganizationRow.use_deemed_progress` フィールド / `getUseDeemedProgress` 関数削除
- [x] `organizationManagementRepository.ts`: `OrganizationRow.use_deemed_progress` / `create` / `update` の引数型・パラメータ配列整理
- [x] `workerProjectRepository.ts`: `WorkerAccessibleProjectRow.use_deemed_progress` 削除
- [x] `organizationService.ts`: `OrganizationResponse.useDeemedProgress` / マッピング / CSV処理 整理
- [x] `workerProjectService.ts`: `useDeemedProgress` マッピング削除
- [x] `types/workerProject.ts`: フィールド削除
- [x] `organizationController.ts`: csvData から `use_deemed_progress` 削除
- [x] `messages.ts`: `useDeemedProgressInvalid` キー削除（ja/en）
- 対象外 `backend/scripts/test-maiml-publish-worker.ts`: スクリプトのため対象外

### Step 3: `use_deemed_progress` 関連コードの削除（フロントエンド）

- [x] `types/organization.ts`: `OrganizationData.useDeemedProgress` 削除
- [x] `types/project.ts`: `WorkerProject.useDeemedProgress` 削除
- [x] `OrganizationManagement.tsx`: `selectedUseDeemedProgress` state / フィルタロジック / フィルターUI / フォーム項目（新規・編集）削除
- [x] `ExperimentWorkerMenu.tsx`: `selectedProjectUseDeemedProgress` 変数 / `WorkRecordPanel` への prop 削除
- [x] `WorkRecordPanel.tsx`: `WorkRecordPanelProps.useDeemedProgress` 削除

### Step 4: `progress_rate` 関連コードの削除（バックエンド）

- [x] SQL ファイルの修正（updateStatus / insert）
- [x] `sumProgressRateByTask.sql` / `updateProgressRate.sql` ファイルを削除
- [x] SQL ファイルの修正（listMethodsAndTasksByProject / findDetailByTaskId / findTransitionsByTaskId）
- [x] `transitionDataRepository.ts`: 型定義・`updateStatus` params・`insert` params 整理
- [x] `progressService.ts`: `finalProgressRate` ロジック削除、`normalizeProgress` メソッド削除、`progress` フィールドの返却削除、`overall_percentage` 算出を完了率ベース（`Math.round(completed / total * 100)`）に変更
- [x] `backend/src/types/progress.ts`: `TransitionProgress.progress` フィールド削除
- [x] `progressController.ts`: `progressRate` リクエスト変数 / `updateData` スプレッド / レスポンス整理
- [x] `types/transitionData.ts`: `progress_rate` フィールド削除
- [x] `types/database.ts`: `progress_rate` フィールド削除
- [x] `types/task.ts`: `progress_rate` フィールド削除
- [x] `types/api.ts`: `progressRate` フィールド削除
- [x] `eventLogRepository.ts`: `EventLogData.progress_rate` / INSERT ロジック削除
- [x] `projectTaskDetailRepository.ts`: `progressRate` マッピング削除
- [x] `taskService.ts`: `progress_rate` マッピング削除

### Step 5: `progress_rate` / `progress` 関連コードの削除（フロントエンド）

- [x] `frontend/src/types/project.ts`: `WorkerTask.progress_rate` 削除
- [x] `frontend/src/types/progress.ts`: `TransitionProgress.progressPercentage` 削除、`WorkDetail.progressPercentage` 削除
- [x] `frontend/src/services/projectApiService.ts`: インライン型の `progress: number` 削除、マッピングの `progressPercentage: t.progress ?? 0` 削除

### Step 6: E2Eテストコードの整理

- [ ] `tests/e2e/steps/5_experiment_worker/5-2_experiment_record.ts`: `use_deemed_progress` 操作コード削除（17 箇所残存）
- [ ] `tests/e2e/steps/provider/1_provider.ts`: `use_deemed_progress` 操作コード削除（5 箇所残存）
- [ ] `tests/e2e/steps/1_provider/1_provider.ts`: `use_deemed_progress` 操作コード削除（5 箇所残存）

### Step 7: TypeScript コンパイル確認

- [x] `cd backend && npx tsc --noEmit` でエラー 0 件を確認
- [x] `cd frontend && npx tsc --noEmit` でエラー 0 件を確認

---

## 注意事項

### ① `normalizeProgress` メソッドの完全削除と `progress` フィールドの削除

`normalizeProgress` は `progress_rate` を受け取るためのメソッドであり、トランジションの進捗率自体を管理しない方針となったため**メソッドごと削除**する。  
`TransitionProgress.progress` フィールド自体も不要のため**削除**する。

削除に伴い、`normalizeProgress` の戻り値・`progress` フィールドを使っている箇所も合わせて変更が必要。

| 影響箇所 | 変更内容 |
|---------|---------|
| `backend/src/types/progress.ts` の `TransitionProgress.progress` フィールド | 削除 |
| `progressService.ts` L596: `const progress = this.normalizeProgress(...)` と `progress,` の返却 | 削除（`TransitionProgress` から `progress` フィールドがなくなるため） |
| `progressService.ts` L690: `transitions.reduce((sum, t) => sum + t.progress, 0)` による `overall_percentage` 算出 | `progress` フィールドがなくなるため、`overall_percentage` の算出を完了率（`Math.round(completed / total * 100)`）に変更する |
| `frontend/src/types/progress.ts` の `TransitionProgress.progressPercentage` フィールド | 削除 |
| `frontend/src/types/progress.ts` の `WorkDetail.progressPercentage` フィールド | 削除 |
| `frontend/src/services/projectApiService.ts` L1886 インライン型の `progress: number` | 削除 |
| `frontend/src/services/projectApiService.ts` L1914 のマッピング `progressPercentage: t.progress ?? 0` | 削除 |

> **確認済み**: `TransitionStatusItem`（フロントエンド）にはすでに `progressPercentage` フィールドが存在しない。画面コンポーネントでも `progressPercentage` の表示利用は確認されていない。

### ② SQL パラメータ番号の詰め直し

- `update.sql`: `$7: use_deemed_progress` 削除 → `$8〜$13` を `$7〜$12` にシフト。Repository/Service の配列も同時変更。
- `create.sql`: `$8: use_deemed_progress` 削除 → `$9〜$15` を `$8〜$14` にシフト。`organizationService.ts` の `orgValues` 配列も同時変更。
- `updateStatus.sql`: `$2: progress_rate` 削除 → `$3〜$8` を `$2〜$7` にシフト。

### ③ `findWorkerAccessible.sql` の JOIN 削除

`organization` テーブルへの INNER JOIN は `use_deemed_progress` 取得のみが目的のため、JOIN ごと削除する。

---

## リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| パラメータ番号ずれによるデータ不整合 | 高 | tsc --noEmit + 手動動作確認で検証 |
| `normalizeProgress` 削除に伴う `overall_percentage` 算出ロジック変更による値の変化 | 中 | 完了率ベースの算出に変更し、動作確認で検証 |
| E2E テスト（5-2-12）が壊れる | 低 | みなし進捗廃止済みのため削除対象 |

---

## テスト計画

- [ ] `npx tsc --noEmit`（backend）でコンパイルエラー 0 件
- [ ] `npx tsc --noEmit`（frontend）でコンパイルエラー 0 件
- [ ] 組織管理画面で組織の一覧表示・新規作成・編集が正常動作すること
- [ ] 実験作業者メニューでプロジェクト選択が正常動作すること

---

## 承認記録
- **計画書提示日時**: 2026-09-24 10:00
- **承認日時**: -
- **承認者コメント**: -

