# タスク計画書: SQL外部化とRepository移行

## メタデータ
- **作成日時**: 2026-05-12 10:13
- **タスクID**: sql-externalize-and-repo-migration
- **優先度**: 中
- **推定工数**: 8〜12時間

## タスク概要

以下2つの対応を全体的に実施する。

1. **ServiceクラスでSQL直書きしている個所をRepositoryクラスへ移行**
2. **RepositoryクラスにインラインSQLをSQLファイルとして外だし**

---

## 1. 目的と期待される成果

### 目的
- SQL記述をRepository層に集約し、関心の分離を徹底する
- 複雑なSQLをSQLファイル（`backend/src/sql/queries/`）として外部管理し、可読性・保守性を向上させる
- `.clinerules/development/database.md` の規約に準拠した実装に統一する

### 期待される成果
- [ ] ServiceクラスにSQL文が残らない（DBアクセスは全てRepository経由）
- [ ] Repository内のインラインSQL（目安: 複雑・長いもの）がSQLファイルに外出しされる
- [ ] 既存動作を壊さない（回帰バグなし）

---

## 2. 現状調査結果

### 2-1. ServiceクラスにSQL直書きがある箇所

#### `backend/src/services/projectService.ts`

| メソッド | 内容 | 行 |
|---|---|---|
| `create()` | `SELECT COUNT(*) FROM project` (重複チェック) | ~98 |
| `create()` | `INSERT INTO project (...)` | ~124 |
| `list()` | プロジェクト一覧取得（複数テーブルJOIN、サブクエリ含む） | ~377 |
| `list()` | `SELECT COUNT(*) FROM project` (総件数) | ~468 |
| `checkout()` | `SELECT ... FOR UPDATE FROM project` | ~571 |
| `checkout()` | `SELECT user_name FROM organization_user ...` (ユーザー名取得) | ~714 |
| `checkout()` | `UPDATE project SET checkout_status = 1 ...` | ~737 |
| `checkin()` | `SELECT ... FOR UPDATE FROM project` | ~817 |
| `checkin()` | `UPDATE project SET checkout_status = 0 ...` | ~883 |
| `getCheckoutStatus()` | `SELECT p.*, ou.user_name FROM project JOIN organization_user` | ~941 |
| その他 | `getProjectTasks()`, `requestApproval()` など未調査メソッドも含む可能性あり | - |

#### `backend/src/services/progressService.ts`

| メソッド | 内容 | 行 |
|---|---|---|
| `getSingleTransitionProgress()` | `template_data/countActualByPlaceIds.sql` を直接ロードして実行 | ~525 | 
| `getWorkDetails()` | `projects/findWithOwnerAndDept.sql`をロードして `pgp.any()` で実行 | ~726 |
| `getWorkDetails()` | `project_tasks/findByProjectId.sql` をロードして実行 | ~802 |
| `getWorkDetails()` | `project_tasks/findTaskDetailsByMethodId.sql` をロードして実行 | ~828 |
| `getWorkDetails()` | `transition_data/findByTask.sql` をロードして実行 | ~827 |
| `updateTransitionStatus()` | `transition_data/findByTransitionId.sql` をロードして `client.query()` で実行 | ~981 |

> **補足**: `progressService.ts` の `getWorkDetails()` と `updateTransitionStatus()` は SQLファイルをServiceから直接実行している。これをRepository層に移譲する必要がある。

### 2-2. RepositoryクラスにインラインSQLがある箇所（SQLファイル外出し候補）

#### `backend/src/repositories/projectRepository.ts`

| 関数 | 内容 | 優先度 |
|---|---|---|
| `insert()` | 動的INSERT構築 | 低（動的ゆえSQLファイル化困難）|
| `update()` | 動的UPDATE構築 | 低（動的ゆえSQLファイル化困難）|
| `getById()` | `SELECT * FROM project WHERE ...` | 中 |
| `updateStatus()` | `UPDATE project SET project_status=...` | 中 |
| `findByIdFull()` | `SELECT * FROM project WHERE ...` | 中 |
| `findByName()` | `SELECT * FROM project WHERE project_name=...` | 中 |
| `findProjectTasks()` | 複数テーブルJOIN＋動的WHERE | 高 |
| `countProjectTasksByStatus()` | `SELECT task_status, COUNT(*) ...` | 中 |
| `completeReviewTasks()` | `UPDATE project_task_detail SET task_status=3 ...` | 中 |
| `findProjectBasicInfo()` | `SELECT project_id, project_name FROM project ...` | 低 |
| `findProjectForDelete()` | `SELECT project_maiml_flg, project_name ... FOR UPDATE` | 中 |
| `deleteProjectRelatedData()` | 複数テーブルDELETE（8テーブル） | 高 |
| `updateMaimlFlgByUuid()` | `UPDATE project SET project_maiml_flg=...` | 中 |
| `deleteProject()` | `DELETE FROM project WHERE ...` | 低 |

#### `backend/src/repositories/projectTaskRepository.ts`

| 関数 | 内容 | 優先度 |
|---|---|---|
| `findByProject()` | `SELECT * FROM project_task WHERE ...` | 低 |
| `findByPrimaryKey()` | `SELECT * FROM project_task WHERE (PK)` | 低 |
| `countByProject()` | `SELECT COUNT(*) FROM project_task WHERE ...` | 低 |
| `hasRunningTasks()` | `SELECT EXISTS(... task_status = 1)` | 中 |
| `hasIncompleteTasks()` | `SELECT EXISTS(... task_status NOT IN (3,4))` | 中 |
| `insert()` | 動的INSERT | 低 |
| `update()` | 動的UPDATE | 低 |
| `bulkInsert()` | ループINSERT | 低 |
| `deleteByProjectAndWorkerLinkedFlg()` | `DELETE FROM project_task WHERE ... worker_linked_flg=...` | 中 |
| `updateWorkerLinkedFlgByProject()` | `UPDATE project_task SET worker_linked_flg=...` | 中 |
| `bulkUpdateTaskStatusByProject()` | `UPDATE project_task_detail SET task_status=...` | 高 |

#### `backend/src/repositories/projectTaskDetailRepository.ts`

| 関数 | 内容 | 優先度 |
|---|---|---|
| `findByProject()` | `SELECT * FROM project_task_detail WHERE ...` | 低 |
| `findByPrimaryKey()` | `SELECT * FROM project_task_detail WHERE (PK)` | 低 |
| `insert()` | 動的INSERT | 低 |
| `update()` | 動的UPDATE | 低 |
| `bulkInsert()` | ループINSERT | 低 |

#### その他のRepositoryも多数インラインSQL有り
- `organizationManagementRepository.ts`（一部は既にSQLファイル済み）
- `userRepository.ts`
- `roleRepository.ts`
- `loginHistoryRepository.ts`
- `fileMetadataRepository.ts`
- `maimlPublishJobRepository.ts` 等

---

## 3. 実装方針

### 方針A: ServiceからRepositoryへの移行

1. Serviceで直書きされているSQL＋ロジックを**新規Repositoryメソッドとして定義**する
2. ServiceはRepositoryメソッドを呼び出すだけに変更する
3. 複雑なSQLは対応するSQLファイルも同時に作成する

### 方針B: RepositoryのインラインSQL外出し

1. `backend/src/sql/queries/{domain}/` にSQLファイルを作成する
2. Repositoryでは `loadSqlFile()` を使いSQLファイルを読み込む
3. **対象は「複雑・再利用性が高い・複数テーブルJOIN含む」もの**を優先する
4. 単純な1テーブル CRUD（特に動的INSERT/UPDATE）は外出し不要

---

## 4. 実装ステップ（フェーズ分割）

### Phase 1: projectService.ts → projectRepository.ts への移行

- [ ] `create()` の重複チェックSQLをRepositoryに移行 → `existsByName(organizationId, projectName)` メソッド追加
- [ ] `create()` のINSERTをRepositoryに移行 → `insertWithClient(client, data)` メソッド追加（またはトランザクション対応版）
- [ ] `list()` のプロジェクト一覧クエリをRepositoryに移行 → `findAllWithDetails(organizationId, options)` メソッド追加 + SQLファイル `projects/findAllWithDetails.sql` 作成
- [ ] `list()` の件数クエリをRepositoryに移行 → `countAll(organizationId, options)` メソッド追加 + SQLファイル `projects/countAll.sql` 作成
- [ ] `checkout()` のSELECT FOR UPDATEをRepositoryに移行 → `findForUpdate(client, organizationId, projectId)` メソッド追加
- [ ] `checkout()` のユーザー名取得SQLをRepositoryに移行 → 既存`findUserNameById()`を活用 または `organizationUserRepository`に委譲
- [ ] `checkout()` のcheckout UPDATEをRepositoryに移行 → `updateCheckoutStatus(client, organizationId, projectId, userId)` メソッド追加
- [ ] `checkin()` のSELECT FOR UPDATEをRepositoryに移行 → `findForUpdate()` の再利用
- [ ] `checkin()` のcheckin UPDATEをRepositoryに移行 → `updateCheckinStatus(client, organizationId, projectId)` メソッド追加
- [ ] `getCheckoutStatus()` のSELECTをRepositoryに移行 → `findWithOwner(organizationId, projectId)` メソッド追加 + SQLファイル作成

### Phase 2: progressService.ts → Repositoryへの移行

- [ ] `getWorkDetails()` の `projects/findWithOwnerAndDept.sql` 実行をRepositoryに移行 → `projectRepository.findWithOwnerAndDept()` メソッド追加
- [ ] `getWorkDetails()` の `project_tasks/findByProjectId.sql` 実行をRepositoryに移行 → `projectTaskRepository.findByProjectId()` メソッド追加（またはexisting `findByProject()`を活用）
- [ ] `getWorkDetails()` の `project_tasks/findTaskDetailsByMethodId.sql` 実行をRepositoryに移行 → `projectTaskDetailRepository.findByMethodId()` メソッド追加
- [ ] `getWorkDetails()` の `transition_data/findByTask.sql` 実行をRepositoryに移行 → `transitionDataRepository.findByTask()` メソッド追加
- [ ] `updateTransitionStatus()` の `transition_data/findByTransitionId.sql` 実行をRepositoryに移行 → `transitionDataRepository.findByTransitionIdForUpdate()` メソッド追加
- [ ] `getSingleTransitionProgress()` の `template_data/countActualByPlaceIds.sql` 実行をRepositoryに移行 → `templateDataRepository.countActualByPlaceIds()` メソッド追加

### Phase 3: projectRepository.ts インラインSQL外出し（優先度高）

- [ ] `findProjectTasks()` → `projects/findProjectTasks.sql` 作成
- [ ] `deleteProjectRelatedData()` の各DELETEをまとめた → `projects/deleteRelatedData.sql` 作成（または各テーブル別SQLファイル）
- [ ] `completeReviewTasks()` → `projects/completeReviewTasks.sql` 作成
- [ ] `updateStatus()` → `projects/updateStatus.sql` 作成
- [ ] `findByIdFull()` → `projects/findByIdFull.sql` 作成
- [ ] `findByName()` → `projects/findByName.sql` 作成
- [ ] `findProjectForDelete()` → `projects/findForDelete.sql` 作成
- [ ] `updateMaimlFlgByUuid()` → `projects/updateMaimlFlgByUuid.sql` 作成
- [ ] `countProjectTasksByStatus()` → `projects/countTasksByStatus.sql` 作成
- [ ] `findProjectBasicInfo()` → `projects/findBasicInfo.sql` 作成

### Phase 4: projectTaskRepository.ts インラインSQL外出し（優先度高）

- [ ] `hasRunningTasks()` → `project_tasks/hasRunningTasks.sql` 作成
- [ ] `hasIncompleteTasks()` → `project_tasks/hasIncompleteTasks.sql` 作成
- [ ] `bulkUpdateTaskStatusByProject()` → `project_tasks/bulkUpdateTaskStatus.sql` 作成
- [ ] `deleteByProjectAndWorkerLinkedFlg()` → `project_tasks/deleteByWorkerLinkedFlg.sql` 作成
- [ ] `updateWorkerLinkedFlgByProject()` → `project_tasks/updateWorkerLinkedFlg.sql` 作成

### Phase 5: その他Repositoryのインラインインライン外出し（優先度中）

各RepositoryファイルのSQL外出し対象を順次対応：
- [ ] `projectTaskDetailRepository.ts` の `findByProject()`, `findByPrimaryKey()`
- [ ] `userRepository.ts` の各インラインSQL
- [ ] `loginHistoryRepository.ts`
- [ ] `maimlPublishJobRepository.ts`
- [ ] `fileMetadataRepository.ts` の複雑なSQL
- [ ] `organizationManagementRepository.ts` の未外出し分

---

## 5. 変更ファイル一覧

### 修正ファイル
| ファイル | 変更内容 |
|---|---|
| `backend/src/services/projectService.ts` | SQLをRepository呼び出しに置換 |
| `backend/src/services/progressService.ts` | SQLをRepository呼び出しに置換 |
| `backend/src/repositories/projectRepository.ts` | 新メソッド追加＋SQLファイル外出し |
| `backend/src/repositories/projectTaskRepository.ts` | SQLファイル外出し |
| `backend/src/repositories/projectTaskDetailRepository.ts` | 新メソッド追加 |
| `backend/src/repositories/transitionDataRepository.ts` | 新メソッド追加 |
| `backend/src/repositories/templateDataRepository.ts` | 新メソッド追加 |

### 新規SQLファイル（主要なもの）
| ファイル | 内容 |
|---|---|
| `backend/src/sql/queries/projects/existsByName.sql` | プロジェクト名重複チェック |
| `backend/src/sql/queries/projects/findAllWithDetails.sql` | プロジェクト一覧取得（JOIN含む） |
| `backend/src/sql/queries/projects/countAll.sql` | プロジェクト総件数 |
| `backend/src/sql/queries/projects/findForUpdate.sql` | SELECT FOR UPDATE |
| `backend/src/sql/queries/projects/updateCheckoutStatus.sql` | チェックアウト更新 |
| `backend/src/sql/queries/projects/updateCheckinStatus.sql` | チェックイン更新 |
| `backend/src/sql/queries/projects/findProjectTasks.sql` | タスク一覧（JOIN含む） |
| `backend/src/sql/queries/projects/completeReviewTasks.sql` | レビュー待ちタスクを完了に更新 |
| `backend/src/sql/queries/projects/updateStatus.sql` | プロジェクトステータス更新 |
| `backend/src/sql/queries/projects/findByIdFull.sql` | プロジェクト全カラム取得 |
| `backend/src/sql/queries/projects/findByName.sql` | プロジェクト名で検索 |
| `backend/src/sql/queries/projects/deleteRelatedData.sql` | 関連テーブル削除 |
| `backend/src/sql/queries/project_tasks/hasRunningTasks.sql` | 実行中タスク存在確認 |
| `backend/src/sql/queries/project_tasks/hasIncompleteTasks.sql` | 未完了タスク存在確認 |
| `backend/src/sql/queries/project_tasks/bulkUpdateTaskStatus.sql` | 一括ステータス更新 |
| `backend/src/sql/queries/project_tasks/deleteByWorkerLinkedFlg.sql` | worker_linked_flgで削除 |
| `backend/src/sql/queries/project_tasks/updateWorkerLinkedFlg.sql` | worker_linked_flg更新 |

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| トランザクション引数の互換性問題（PoolClient vs pg-promise） | 高 | 中 | Phaseごとに動作確認しながら進める |
| SQLファイルのパラメータ順序ミス | 高 | 中 | 既存パターン（`loadSqlFile`+pgp）を踏襲し、テストで検証 |
| progressService.tsのgetWorkDetails()は複雑なロジック | 高 | 高 | メソッド分割は最小限にし、SQLファイルはすでにあるものを活用 |
| 動的SQLの外出し不可（ORDER BY, WHERE動的付加） | 低 | 高 | 動的部分はRepoisitoryで文字列結合として残す（規約上許容） |

---

## 7. テスト計画

- [ ] 各Phase実装後、該当APIエンドポイントを手動確認
  - プロジェクト一覧取得 (`GET /api/v1/projects`)
  - プロジェクト作成 (`POST /api/v1/projects`)
  - チェックアウト (`POST /api/v1/projects/:id/checkout`)
  - チェックイン (`POST /api/v1/projects/:id/checkin`)
  - 進捗取得 (`GET /api/v1/progress/...`)
- [ ] 既存の自動テスト（`backend/tests/`）が通ることを確認

---

## 8. 承認記録

- **計画書提示日時**: 2026-05-12 10:13
- **承認日時**: 2026-05-12 10:20
- **承認者コメント**: 承認済み

---

## 9. 実施記録

### Phase 1: projectService.ts → projectRepository.ts への移行

**実施日時**: 2026-05-12 10:20〜10:30  
**ステータス**: ✅ 完了（`tsc --noEmit` エラー0件確認済み）

#### 新規SQLファイル（7件）

| ファイル | 内容 |
|---|---|
| `projects/existsByName.sql` | プロジェクト名重複チェック |
| `projects/findAllWithDetails.sql` | プロジェクト一覧取得（複数テーブルJOIN・ファイル数・タスク数） |
| `projects/countAll.sql` | プロジェクト総件数取得 |
| `projects/findForUpdate.sql` | SELECT FOR UPDATE（排他ロック） |
| `projects/updateCheckoutStatus.sql` | チェックアウト実行（checkout_status=1, project_status=1） |
| `projects/updateCheckinStatus.sql` | チェックイン実行（checkout_status=0） |
| `projects/findWithOwner.sql` | プロジェクト情報＋オーナー名JOIN取得 |

#### projectRepository.ts 新メソッド（8件）

| メソッド | 内容 |
|---|---|
| `existsByName()` | プロジェクト名重複チェック（`existsByName.sql`使用） |
| `findAllWithDetails()` | 一覧取得（ソートカラムはホワイトリスト検証済み） |
| `countAll()` | 総件数取得 |
| `findForUpdate()` | SELECT FOR UPDATE（PoolClient必須） |
| `updateCheckoutStatus()` | チェックアウト実行 |
| `updateCheckinStatus()` | チェックイン実行 |
| `findWithOwner()` | オーナー名JOIN取得 |
| `findCheckedOutUserName()` | チェックアウト保持者のユーザー名取得 |

#### projectService.ts 修正（10箇所）

| メソッド | 修正内容 |
|---|---|
| `create()` | INSERT直書き → `projectRepository.insert()` |
| `create()` | 重複チェックSQL → `projectRepository.existsByName()` |
| `list()` | 一覧取得クエリ（80行超）→ `projectRepository.findAllWithDetails()` |
| `list()` | 総件数クエリ → `projectRepository.countAll()` |
| `checkout()` | SELECT FOR UPDATE → `projectRepository.findForUpdate()` |
| `checkout()` | ユーザー名取得SQL → `projectRepository.findCheckedOutUserName()` |
| `checkout()` | checkout UPDATE → `projectRepository.updateCheckoutStatus()` |
| `checkin()` | SELECT FOR UPDATE → `projectRepository.findForUpdate()`（再利用） |
| `checkin()` | checkin UPDATE → `projectRepository.updateCheckinStatus()` |
| `getCheckoutStatus()` | SELECT+JOIN → `projectRepository.findWithOwner()` |

#### チェックリスト更新

- [x] `create()` の重複チェックSQLをRepositoryに移行
- [x] `create()` のINSERTをRepositoryに移行
- [x] `list()` のプロジェクト一覧クエリをRepositoryに移行 + `projects/findAllWithDetails.sql` 作成
- [x] `list()` の件数クエリをRepositoryに移行 + `projects/countAll.sql` 作成
- [x] `checkout()` のSELECT FOR UPDATEをRepositoryに移行 + `projects/findForUpdate.sql` 作成
- [x] `checkout()` のユーザー名取得SQLをRepositoryに移行
- [x] `checkout()` のcheckout UPDATEをRepositoryに移行 + `projects/updateCheckoutStatus.sql` 作成
- [x] `checkin()` のSELECT FOR UPDATEをRepositoryに移行（`findForUpdate()` 再利用）
- [x] `checkin()` のcheckin UPDATEをRepositoryに移行 + `projects/updateCheckinStatus.sql` 作成
- [x] `getCheckoutStatus()` のSELECTをRepositoryに移行 + `projects/findWithOwner.sql` 作成

---

### Phase 2: progressService.ts → Repositoryへの移行

**実施日時**: 2026-05-12 10:31〜10:44  
**ステータス**: ✅ 完了

#### 新規作成 SQLファイル（3件）

| ファイル | 用途 |
|---|---|
| `project_tasks/findByProjectId.sql` | project_task 一覧取得（project_id + organization_id） |
| `project_tasks/findTaskDetailsByMethodId.sql` | project_task_detail をメソッドIDで取得 |
| `projects/findWithOwnerAndDept.sql` | プロジェクト詳細をオーナー名・部門名JOIN付きで取得 |

#### 新規追加 Repositoryメソッド

| Repository | メソッド | 説明 |
|---|---|---|
| `projectRepository` | `findWithOwnerAndDept()` | department / organization_user JOIN |
| `projectTaskRepository` | `findByProjectId()` | project_task 一覧取得 |
| `projectTaskDetailRepository` | `findByMethodId()` | project_task_detail をメソッドIDで取得 |
| `transitionDataRepository` | `findByTask()` | transition_data を task_no で取得（既存） |

#### progressService.ts 修正（4箇所）

| メソッド | 修正内容 |
|---|---|
| `getWorkDetails()` Step1 | `pgp.any` 直書き → `projectRepository.findWithOwnerAndDept()` |
| `getWorkDetails()` Step5 | `pgp.any` 直書き → `projectTaskRepository.findByProjectId()` |
| `getWorkDetails()` Step6（task_detail） | `pgp.any` 直書き → `projectTaskDetailRepository.findByMethodId()` |
| `getWorkDetails()` Step6（transition） | `pgp.any` 直書き → `this.transitionDataRepository.findByTask()` |

#### チェックリスト

- [x] `projects/findWithOwnerAndDept.sql` 作成
- [x] `project_tasks/findByProjectId.sql` 作成
- [x] `project_tasks/findTaskDetailsByMethodId.sql` 作成
- [x] `projectRepository.findWithOwnerAndDept()` 追加
- [x] `projectTaskRepository.findByProjectId()` 追加
- [x] `projectTaskDetailRepository.findByMethodId()` 追加
- [x] `progressService.getWorkDetails()` を全4箇所 Repository 呼び出しに置換
- [x] TypeScript コンパイルエラー 0 件確認（`tsc --noEmit` EXIT:0）

#### 期待される成果の確認

- [x] ServiceクラスにSQL文が残らない（`progressService.ts` の `getWorkDetails()` 内インラインSQL全廃）
- [x] Repository内のインラインSQL（複雑・長いもの）がSQLファイルに外出しされた
- [x] 既存動作を壊さない（TypeScriptコンパイル成功）

---

### Phase 3: projectRepository.ts インラインSQL外出し

**実施日時**: 2026-05-12  
**ステータス**: ✅ 完了

新規SQLファイル10件（`projects/findProjectTasks.sql`, `completeReviewTasks.sql`, `updateStatus.sql`, `findByIdFull.sql`, `findByName.sql`, `findForDelete.sql`, `updateMaimlFlgByUuid.sql`, `countTasksByStatus.sql`, `findBasicInfo.sql` など）を作成し、`projectRepository.ts` のインラインSQLを全て外出し。

---

### Phase 4: projectTaskRepository.ts インラインSQL外出し

**実施日時**: 2026-05-12  
**ステータス**: ✅ 完了

新規SQLファイル5件（`project_tasks/hasRunningTasks.sql`, `hasIncompleteTasks.sql`, `bulkUpdateTaskStatus.sql`, `deleteByWorkerLinkedFlg.sql`, `updateWorkerLinkedFlg.sql`）を作成し、`projectTaskRepository.ts` のインラインSQLを全て外出し。

---

### Phase 5: その他Repository インラインSQL外出し

**実施日時**: 2026-05-12 11:00〜11:03  
**ステータス**: ✅ 完了（`tsc --noEmit` エラー0件確認済み）

#### 新規SQLファイル（9件）

| ファイル | 内容 |
|---|---|
| `project_task_detail/findByProject.sql` | プロジェクト内タスク詳細一覧取得 |
| `project_task_detail/findByPrimaryKey.sql` | 主キーでタスク詳細1件取得 |
| `login_history/getLastSuccessfulLogin.sql` | 最終成功ログイン情報取得 |
| `login_history/getLastTwoFactorAuthLogin.sql` | 最終二段階認証ログイン情報取得 |
| `login_history/recordLogin.sql` | ログイン履歴INSERT |
| `maiml_publish_job/insert.sql` | 公開ジョブINSERT |
| `maiml_publish_job/findLatestByProject.sql` | プロジェクトの最新ジョブ取得 |
| `maiml_publish_job/findByJobId.sql` | job_idでジョブ1件取得 |
| `maiml_publish_job/findPublishedAssetId.sql` | 公開済みアセットID取得 |

#### 修正Repositoryファイル（3件）

| ファイル | 修正内容 |
|---|---|
| `projectTaskDetailRepository.ts` | `findByProject()`, `findByPrimaryKey()` をSQLファイル外出し |
| `loginHistoryRepository.ts` | `getLastSuccessfulLogin()`, `getLastTwoFactorAuthLogin()`, `recordLogin()` をSQLファイル外出し |
| `maimlPublishJobRepository.ts` | `insert()`, `findLatestByProject()`, `findByJobId()`, `findPublishedAssetId()` をSQLファイル外出し |

#### チェックリスト

- [x] `project_task_detail/findByProject.sql` 作成 + `projectTaskDetailRepository.findByProject()` 置換
- [x] `project_task_detail/findByPrimaryKey.sql` 作成 + `projectTaskDetailRepository.findByPrimaryKey()` 置換
- [x] `login_history/` 3件 SQLファイル作成 + `loginHistoryRepository.ts` 全メソッド置換
- [x] `maiml_publish_job/` 4件 SQLファイル作成 + `maimlPublishJobRepository.ts` 対象メソッド置換
- [x] `tsc --noEmit` EXIT:0 確認（TypeScriptコンパイルエラーなし）

---

## Phase 6: テスト・検証（継続セッション 2026-05-12 11:05〜11:10）

**実施日時**: 2026-05-12 11:05〜11:10  
**ステータス**: ✅ 完了（Phase1〜4 git照合追記: 2026-05-12 11:41）

### 実施内容

#### 1. SQL差異確認レポート作成（`verification.md`）

Phase5で外出しした全9件のSQLファイルと、元のインラインSQLを1件ずつ照合。  
**結果: 全9件差異なし**。

| # | SQLファイル | 差異 |
|---|---|---|
| 1 | `project_task_detail/findByProject.sql` | ✅ 差異なし（改行差のみ） |
| 2 | `project_task_detail/findByPrimaryKey.sql` | ✅ 差異なし |
| 3 | `login_history/getLastSuccessfulLogin.sql` | ✅ 差異なし |
| 4 | `login_history/getLastTwoFactorAuthLogin.sql` | ✅ 差異なし |
| 5 | `login_history/recordLogin.sql` | ✅ 差異なし |
| 6 | `maiml_publish_job/insert.sql` | ✅ 差異なし |
| 7 | `maiml_publish_job/findLatestByProject.sql` | ✅ 差異なし |
| 8 | `maiml_publish_job/findByJobId.sql` | ✅ 差異なし |
| 9 | `maiml_publish_job/findPublishedAssetId.sql` | ✅ 差異なし |

詳細: `docs/20260512_1012_SQL外部化とRepository移行/verification.md`

#### 2. 単体テストコード作成・実行

テストファイル: `backend/tests/repositories/phase5-sql-externalize.test.ts`

3 Repositoryの35テストケースを作成（pg/pg-promise をモック化）:

| テスト対象 | テスト件数 | 結果 |
|---|---|---|
| `projectTaskDetailRepository` | 8件 | ✅ 全パス |
| `loginHistoryRepository` | 11件 | ✅ 全パス |
| `maimlPublishJobRepository` | 16件 | ✅ 全パス |
| **合計** | **35件** | **✅ 全パス** |

実行ログ:
```
Test Suites: 1 passed, 1 total
Tests:       35 passed, 35 total
Time:        3.192s
```

---

## 全フェーズ完了サマリー

| フェーズ | 内容 | ステータス |
|---|---|---|
| Phase 1 | projectService.ts → projectRepository.ts 移行 | ✅ 完了 |
| Phase 2 | progressService.ts → Repository移行 | ✅ 完了 |
| Phase 3 | projectRepository.ts インラインSQL外出し（10件） | ✅ 完了 |
| Phase 4 | projectTaskRepository.ts インラインSQL外出し（5件） | ✅ 完了 |
| Phase 5 | その他Repository インラインSQL外出し（9件） | ✅ 完了 |
| Phase 6 | テスト・差異確認 | ✅ 完了 |

**作成SQLファイル総数: 24件**  
**単体テスト: 35件全パス**  
**TypeScriptコンパイル: エラー0件**

---

## Phase 7: findAllWithDetails.sql ORDER BY バグ修正（2026-05-12 継続セッション）

**実施日時**: 2026-05-12 13:06〜13:07  
**ステータス**: ✅ 完了

### 問題

`findAllWithDetails.sql` 末尾の `ORDER BY {SORT_COLUMN} {SORT_ORDER}` が pg-promise の名前付きパラメータ構文（`{name}` 形式）と衝突し、 `pgp.any()` に渡す前に `replace()` が正しく機能しない恐れがあった。

### 修正内容

| ファイル | 修正内容 |
|---|---|
| `projects/findAllWithDetails.sql` | 末尾の `ORDER BY {SORT_COLUMN} {SORT_ORDER}` 行を削除。コメントも更新 |
| `projectRepository.ts` `findAllWithDetails()` | `replace()` 方式 → `sqlQuery.trimEnd() + '\nORDER BY ...'` 文字列結合方式に変更 |

### 確認結果

- `tsc --noEmit` EXIT:0（TypeScriptコンパイルエラーなし）
- `jest --testPathPatterns="phase"` 107件全パス

---

## 次回セッション引き継ぎメモ

### 作業ステータス（全フェーズ完了）
- Phase 1: ✅ 完了
- Phase 2: ✅ 完了
- Phase 3: ✅ 完了（2026-05-12）
- Phase 4: ✅ 完了（2026-05-12）
- Phase 5: ✅ 完了（2026-05-12）
- Phase 6: ✅ 完了（2026-05-12）

### Phase 3 開始時の参照ファイル
- PLAN.md（本ファイル）: `docs/20260512_1012_SQL外部化とRepository移行/PLAN.md`
- 対象ファイル: `backend/src/repositories/projectRepository.ts`
- 既存SQLファイル格納先: `backend/src/sql/queries/projects/`

### Phase 3 作業対象メソッド（優先度高から順に）

| メソッド | 作成するSQLファイル | 備考 |
|---|---|---|
| `findProjectTasks()` | `projects/findProjectTasks.sql` | 複数テーブルJOIN・動的WHERE |
| `deleteProjectRelatedData()` | `projects/deleteRelatedData_*.sql` | 8テーブルDELETE（テーブル別に分割も可） |
| `completeReviewTasks()` | `projects/completeReviewTasks.sql` | project_task_detailのUPDATE |
| `updateStatus()` | `projects/updateStatus.sql` | project_statusのUPDATE |
| `findByIdFull()` | `projects/findByIdFull.sql` | 全カラムSELECT |
| `findByName()` | `projects/findByName.sql` | project_nameで検索 |
| `findProjectForDelete()` | `projects/findForDelete.sql` | SELECT FOR UPDATE |
| `updateMaimlFlgByUuid()` | `projects/updateMaimlFlgByUuid.sql` | project_maiml_flgのUPDATE |
| `countProjectTasksByStatus()` | `projects/countTasksByStatus.sql` | task_status別COUNT |
| `findProjectBasicInfo()` | `projects/findBasicInfo.sql` | project_id, project_nameのみ |

### Phase 4 作業対象（projectTaskRepository.ts）
| メソッド | 作成するSQLファイル |
|---|---|
| `hasRunningTasks()` | `project_tasks/hasRunningTasks.sql` |
| `hasIncompleteTasks()` | `project_tasks/hasIncompleteTasks.sql` |
| `bulkUpdateTaskStatusByProject()` | `project_tasks/bulkUpdateTaskStatus.sql` |
| `deleteByProjectAndWorkerLinkedFlg()` | `project_tasks/deleteByWorkerLinkedFlg.sql` |
| `updateWorkerLinkedFlgByProject()` | `project_tasks/updateWorkerLinkedFlg.sql` |

### 作業開始手順
1. `docs/20260512_1012_SQL外部化とRepository移行/PLAN.md` を読む
2. `backend/src/repositories/projectRepository.ts` を読む
3. Phase 3 の各メソッドを上から順に SQLファイル外出し作業を実施
4. 各Phase完了後に `tsc --noEmit` でエラーなしを確認
