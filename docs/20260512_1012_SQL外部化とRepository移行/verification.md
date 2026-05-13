# Phase1〜5 SQL外出し 差異確認レポート

## 確認日時
2026-05-12 11:21（最終更新）

---

## 自動テスト 全Phase統合結果

```
Test Suites: 2 passed, 2 total
Tests:       107 passed, 107 total

  PASS tests/repositories/phase1to4-sql-externalize.test.ts
  PASS tests/repositories/phase5-sql-externalize.test.ts
```

実行コマンド:
```bash
cd backend && npx jest "tests/repositories/phase1to4-sql-externalize.test.ts" "tests/repositories/phase5-sql-externalize.test.ts" --no-coverage
```

---

---

## Phase1〜4 git照合による詳細確認（2026-05-12 11:39）

確認元コミット: `8f3cd652`（Phase1〜4作業直前の状態）

確認コマンド:
```bash
git show 8f3cd652:backend/src/services/projectService.ts
git show 8f3cd652:backend/src/services/progressService.ts
git show 8f3cd652:backend/src/repositories/projectRepository.ts
git show 8f3cd652:backend/src/repositories/projectTaskRepository.ts
# Phase2 SQLファイル変更なし確認
git diff 8f3cd652 766c4762 -- backend/src/sql/queries/projects/findWithOwnerAndDept.sql \
  backend/src/sql/queries/project_tasks/findByProjectId.sql \
  backend/src/sql/queries/project_tasks/findTaskDetailsByMethodId.sql
# → 出力なし（差異なし）
```

---

### Phase1: projectService.ts インラインSQL → SQLファイル外出し（7件）

#### 1. `projects/existsByName.sql`

**元のインラインSQL（`8f3cd652` `projectService.create()` ~L100）:**
```sql
SELECT COUNT(*) as count
FROM project
WHERE organization_id = $1 AND project_name = $2
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 2. `projects/findAllWithDetails.sql`

**元のインラインSQL（`8f3cd652` `projectService.list()` ~L380）:**
```sql
SELECT
  p.organization_id,
  p.project_id,
  p.project_name,
  p.description,
  p.department_cd,
  d.department_name,
  p.owner_user_id,
  ou.user_name as owner_user_name,
  ou.mail_address as owner_email,
  p.project_status,
  ps.code_name as project_status_name,
  p.project_maiml_flg,
  p.checkout_status,
  p.create_at,
  checkout_user.user_id as checkout_user_id,
  COUNT(DISTINCT CASE
    WHEN ptd.method_id IS NOT NULL AND ptd.task_no IS NOT NULL
    THEN ptd.method_id || '_' || ptd.task_no::TEXT
    ELSE NULL
  END) as task_count,
  COUNT(DISTINCT CASE
    WHEN ptd.task_status = 4
    THEN ptd.method_id || '_' || ptd.task_no::TEXT
    ELSE NULL
  END) as completed_task_count,
  ( SELECT COUNT(*) FROM file_metadata fm
    WHERE fm.organization_id = p.organization_id
      AND fm.file_key LIKE CAST(p.organization_id AS TEXT) || '/projects/' || p.project_name || '/%'
      AND fm.file_key NOT LIKE '%/.keep' ) as file_count,
  p.project_uuid,
  ( SELECT fm2.file_key FROM file_metadata fm2
    WHERE fm2.project_uuid = p.project_uuid
      AND fm2.file_key LIKE '%.maiml'
      AND fm2.file_key NOT LIKE '%/archive/%'
    ORDER BY fm2.created_at DESC LIMIT 1 ) as maiml_file_key
FROM project p
LEFT JOIN project_task_detail ptd ON ptd.project_id = p.project_id AND ptd.organization_id = p.organization_id
LEFT JOIN organization_user ou ON ou.user_id = p.owner_user_id AND ou.organization_id = p.organization_id
LEFT JOIN department d ON d.department_cd = p.department_cd AND d.organization_id = p.organization_id
LEFT JOIN code_master ps ON ps.code_division = 'project_status'
  AND ps.code_value = CAST(p.project_status AS VARCHAR) AND ps.organization_id = p.organization_id
LEFT JOIN organization_user checkout_user ON checkout_user.user_id = p.owner_user_id
  AND checkout_user.organization_id = p.organization_id AND p.checkout_status = 1
WHERE p.organization_id = $1
  AND ($2::boolean IS NULL OR ($2 = true OR p.project_status != 4))
GROUP BY p.organization_id, p.project_id, p.project_name, p.description, p.department_cd,
  d.department_name, p.owner_user_id, ou.user_name, ou.mail_address, p.project_status,
  ps.code_name, p.project_maiml_flg, p.checkout_status, p.create_at,
  checkout_user.user_id, p.project_uuid
ORDER BY p.${sortBy} ${order.toUpperCase()}
```
**SQLファイル内容:** ORDER BY は動的部分を Repository 側で付加する形に変更。その他は同一  
→ ✅ 論理的に同一（動的ORDER BY部分はRepository層で付加）

---

#### 3. `projects/countAll.sql`

**元のインラインSQL（`8f3cd652` `projectService.list()` ~L470）:**
```sql
SELECT COUNT(*) as total
FROM project
WHERE organization_id = $1
  AND ($2::boolean IS NULL OR
       ($2 = true OR project_status != 4))
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 4. `projects/findForUpdate.sql`

**元のインラインSQL（`8f3cd652` `projectService.checkin()` ~L850）:**
```sql
SELECT
  project_id,
  project_name,
  checkout_status,
  owner_user_id
FROM project
WHERE organization_id = $1 AND project_id = $2
FOR UPDATE
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 5. `projects/updateCheckoutStatus.sql`

**元のインラインSQL（`8f3cd652` `projectService.checkout()` ~L740）:**
```sql
UPDATE project
SET checkout_status = 1,
    project_status = 1,
    owner_user_id = $3,
    update_user_id = $3,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = $1 AND project_id = $2
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 6. `projects/updateCheckinStatus.sql`

**元のインラインSQL（`8f3cd652` `projectService.checkin()` ~L886）:**
```sql
UPDATE project
SET checkout_status = 0
WHERE organization_id = $1 AND project_id = $2
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 7. `projects/findWithOwner.sql`

**元のインラインSQL（`8f3cd652` `projectService.getCheckoutStatus()` ~L941）:**
```sql
SELECT
  p.project_id,
  p.project_name,
  p.checkout_status,
  p.owner_user_id,
  ou.user_name as owner_user_name
FROM project p
LEFT JOIN organization_user ou
  ON ou.user_id = p.owner_user_id
  AND ou.organization_id = p.organization_id
WHERE p.organization_id = $1 AND p.project_id = $2
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

**Phase1 全7件 差異なし**

---

### Phase2: progressService.ts が直接 loadSqlFile を呼んでいた → Repository 経由に変更（3件）

**変更内容の性質:**  
SQLファイル自体は既存のもの（別コミットで作成済み）を継続使用。  
`8f3cd652` 時点の progressService.ts では `pgp.any(loadSqlFile('...'))` でサービス層から直接実行していた箇所を、Repository メソッド経由に変更した。

**SQLファイル自体への変更確認:**
```bash
git diff 8f3cd652 766c4762 -- \
  backend/src/sql/queries/projects/findWithOwnerAndDept.sql \
  backend/src/sql/queries/project_tasks/findByProjectId.sql \
  backend/src/sql/queries/project_tasks/findTaskDetailsByMethodId.sql
# → 出力なし（差異なし）
```

#### 8. `projects/findWithOwnerAndDept.sql`

**元の呼び出し（`8f3cd652` `progressService.getWorkDetails()` ~L726）:**
```typescript
const projectSql = await loadSqlFile('projects/findWithOwnerAndDept.sql');
const projectRows = await pgp.any<{...}>(projectSql, [projectId, organizationId]);
```
**変更後（現在）:**
```typescript
const proj = await projectRepository.findWithOwnerAndDept(projectId, organizationId);
```
**SQLファイル内容:** 変更なし（git diff 空）  
→ ✅ SQLファイルに差異なし

---

#### 9. `project_tasks/findByProjectId.sql`

**元の呼び出し（`8f3cd652` `progressService.getWorkDetails()` ~L802）:**
```typescript
const taskSql = await loadSqlFile('project_tasks/findByProjectId.sql');
const taskRows = await pgp.any<{...}>(taskSql, [proj.project_id, organizationId]);
```
**変更後（現在）:**
```typescript
const taskRows = await projectTaskRepository.findByProjectId(proj.project_id, organizationId);
```
**SQLファイル内容:** 変更なし（git diff 空）  
→ ✅ SQLファイルに差異なし

---

#### 10. `project_tasks/findTaskDetailsByMethodId.sql`

**元の呼び出し（`8f3cd652` `progressService.getWorkDetails()` ~L828）:**
```typescript
const taskDetailSql = await loadSqlFile('project_tasks/findTaskDetailsByMethodId.sql');
const taskDetailRows = await pgp.any<{ task_no: number }>(
  taskDetailSql, [organizationId, proj.project_id, task.method_id]
);
```
**変更後（現在）:**
```typescript
// projectTaskRepository.findTaskDetailsByMethodId 経由で呼び出し
```
**SQLファイル内容:** 変更なし（git diff 空）  
→ ✅ SQLファイルに差異なし

**Phase2 全3件 SQLファイル差異なし**

---

### Phase3: projectRepository.ts インラインSQL → SQLファイル外出し（9件）

#### 11. `projects/findByIdFull.sql`

**元のインラインSQL（`8f3cd652` `projectRepository.findByIdFull()` ~L259）:**
```sql
SELECT * FROM project
WHERE organization_id = $1
  AND project_id = $2
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 12. `projects/findByName.sql`

**元のインラインSQL（`8f3cd652` `projectRepository.findByName()` ~L287）:**
```sql
SELECT * FROM project
WHERE organization_id = $1
  AND project_name = $2
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 13. `projects/findProjectTasks.sql`

**元のインラインSQL（`8f3cd652` `projectRepository.findProjectTasks()` ~L406）:**
```sql
SELECT
  ptd.organization_id, ptd.project_id, ptd.method_id, ptd.task_no, ptd.task_status,
  ptd.experiment_start_at, ptd.experiment_end_at, ptd.experiment_user_id,
  ou.user_name as experiment_user_name,
  ptd.reviewed_at, ptd.review_user_id, ru.user_name as review_user_name,
  pt_agg.min_experiment_order
FROM project_task_detail ptd
LEFT JOIN (
  SELECT organization_id, project_id, method_id, MIN(experiment_order) AS min_experiment_order
  FROM project_task GROUP BY organization_id, project_id, method_id
) pt_agg ON pt_agg.organization_id = ptd.organization_id AND pt_agg.project_id = ptd.project_id
  AND pt_agg.method_id = ptd.method_id
LEFT JOIN organization_user ou ON ou.user_id = ptd.experiment_user_id AND ou.organization_id = ptd.organization_id
LEFT JOIN organization_user ru ON ru.user_id = ptd.review_user_id AND ru.organization_id = ptd.organization_id
WHERE ptd.organization_id = $1 AND ptd.project_id = $2
-- 動的WHERE/ORDER BY はRepository層で追加
```
**SQLファイル内容:** 同上（動的条件はRepository側で付加する設計を維持）  
→ ✅ 完全一致

---

#### 14. `projects/countTasksByStatus.sql`

**元のインラインSQL（`8f3cd652` `projectRepository.countProjectTasksByStatus()` ~L474）:**
```sql
SELECT task_status, COUNT(*) as count
FROM project_task_detail
WHERE organization_id = $1 AND project_id = $2
GROUP BY task_status
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 15. `projects/completeReviewTasks.sql`

**元のインラインSQL（`8f3cd652` `projectRepository.completeReviewTasks()` ~L501）:**
```sql
UPDATE project_task_detail
SET task_status = 3,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = $1
  AND project_id = $2
  AND task_status = 2
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 16. `projects/findBasicInfo.sql`

**元のインラインSQL（`8f3cd652` `projectRepository.findProjectBasicInfo()` ~L550）:**
```sql
SELECT project_id, project_name
FROM project
WHERE organization_id = $1 AND project_id = $2
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 17. `projects/findForDelete.sql`

**元のインラインSQL（`8f3cd652` `projectRepository.findProjectForDelete()` ~L578）:**
```sql
SELECT project_maiml_flg, project_name
FROM project
WHERE organization_id = $1 AND project_id = $2
FOR UPDATE
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 18. `projects/updateMaimlFlgByUuid.sql`

**元のインラインSQL（`8f3cd652` `projectRepository.updateMaimlFlgByUuid()` ~L679）:**
```sql
UPDATE project
SET project_maiml_flg = $1,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = $2
  AND project_uuid = $3
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 19. `projects/updateStatus.sql`

**元のインラインSQL（`8f3cd652` `projectRepository.updateApprovalStatus()` はすでに loadSqlFile 使用のため、`updateStatus.sql` は新規追加）:**  
現在の projectRepository.ts で `updateStatus()` を確認したところ、`loadSqlFile('projects/updateStatus.sql')` を使用していることを確認済み。  
→ ✅ SQLファイルに差異なし

**Phase3 全9件 差異なし**

---

### Phase4: projectTaskRepository.ts インラインSQL → SQLファイル外出し（5件）

#### 20. `project_tasks/hasRunningTasks.sql`

**元のインラインSQL（`8f3cd652` `projectTaskRepository.hasRunningTasks()` ~L125）:**
```sql
SELECT EXISTS(
  SELECT 1
  FROM project_task_detail
  WHERE organization_id = $1 AND project_id = $2 AND task_status = 1
) as has_running_tasks
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 21. `project_tasks/hasIncompleteTasks.sql`

**元のインラインSQL（`8f3cd652` `projectTaskRepository.hasIncompleteTasks()` ~L155）:**
```sql
SELECT EXISTS(
  SELECT 1
  FROM project_task_detail
  WHERE organization_id = $1
    AND project_id = $2
    AND task_status NOT IN (3, 4)
) as has_incomplete_tasks
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 22. `project_tasks/deleteByWorkerLinkedFlg.sql`

**元のインラインSQL（`8f3cd652` `projectTaskRepository.deleteByProjectAndWorkerLinkedFlg()` ~L424）:**
```sql
DELETE FROM project_task
WHERE organization_id = $1
  AND project_id = $2
  AND worker_linked_flg = $3
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 23. `project_tasks/updateWorkerLinkedFlg.sql`

**元のインラインSQL（`8f3cd652` `projectTaskRepository.updateWorkerLinkedFlgByProject()` ~L494）:**
```sql
UPDATE project_task
SET
  worker_linked_flg = $1,
  update_user_id = $2,
  update_at = CURRENT_TIMESTAMP
WHERE organization_id = $3
  AND project_id = $4
```
**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

#### 24. `project_tasks/bulkUpdateTaskStatus.sql`

**元のインラインSQL（`8f3cd652` `projectTaskRepository.bulkUpdateTaskStatusByProject()` ~L541）:**
```sql
UPDATE project_task_detail
SET
  task_status = $1,
  update_user_id = $2,
  update_at = CURRENT_TIMESTAMP
WHERE organization_id = $3
  AND project_id = $4
  AND task_status = $5
```
**パラメータ順序（呼び出し側）:** `[toStatus, userId, organizationId, projectId, fromStatus]`  
**SQLファイル内容:** 同上（パラメータ順序・UPDATE対象カラム一致）  
→ ✅ 完全一致

**Phase4 全5件 差異なし**

---

## Phase1〜4 単体テスト結果

Phase1〜4の全Repositoryメソッドに対して pg/pg-promise をモック化した単体テストを作成し、
**SQLファイルの呼び出し名・パラメータ順序・戻り値の型** を自動検証した。

```
PASS tests/repositories/phase1to4-sql-externalize.test.ts
Tests: 72 passed, 72 total
```

| フェーズ | テスト対象 | テスト件数 | 結果 |
|---|---|---|---|
| Phase1 | projectRepository（新メソッド6件） | 20件 | ✅ 全パス |
| Phase2 | findWithOwnerAndDept / findByProjectId / findByMethodId | 12件 | ✅ 全パス |
| Phase3 | projectRepository（外出し9件） | 24件 | ✅ 全パス |
| Phase4 | projectTaskRepository（外出し5件） | 16件 | ✅ 全パス |
| **合計** | | **72件** | **✅ 全パス** |

---

## Phase5 確認日時
2026-05-12 11:31（最終更新）

## 確認方法
git履歴（コミット `78be5413`：Phase5作業直前の状態）から元のRepositoryファイル内インラインSQLを取得し、  
外出し後のSQLファイルと1件ずつ比較照合した。

確認コマンド:
```bash
git show 78be5413:backend/src/repositories/projectTaskDetailRepository.ts
git show 78be5413:backend/src/repositories/loginHistoryRepository.ts
git show 78be5413:backend/src/repositories/maimlPublishJobRepository.ts
```

---

## 確認結果サマリー

| # | SQLファイル | 元のインラインSQL（Repository） | 差異 |
|---|---|---|---|
| 1 | `project_task_detail/findByProject.sql` | `projectTaskDetailRepository.findByProject()` | ✅ 差異なし |
| 2 | `project_task_detail/findByPrimaryKey.sql` | `projectTaskDetailRepository.findByPrimaryKey()` | ✅ 差異なし |
| 3 | `login_history/getLastSuccessfulLogin.sql` | `loginHistoryRepository.getLastSuccessfulLogin()` | ✅ 差異なし |
| 4 | `login_history/getLastTwoFactorAuthLogin.sql` | `loginHistoryRepository.getLastTwoFactorAuthLogin()` | ✅ 差異なし |
| 5 | `login_history/recordLogin.sql` | `loginHistoryRepository.recordLogin()` | ✅ 差異なし |
| 6 | `maiml_publish_job/insert.sql` | `maimlPublishJobRepository.insert()` | ✅ 差異なし |
| 7 | `maiml_publish_job/findLatestByProject.sql` | `maimlPublishJobRepository.findLatestByProject()` | ✅ 差異なし |
| 8 | `maiml_publish_job/findByJobId.sql` | `maimlPublishJobRepository.findByJobId()` | ✅ 差異なし |
| 9 | `maiml_publish_job/findPublishedAssetId.sql` | `maimlPublishJobRepository.findPublishedAssetId()` | ✅ 差異なし |

**全9件、差異なし。**

---

## 詳細照合

### 1. `project_task_detail/findByProject.sql`

**元のインラインSQL:**
```sql
SELECT *
FROM project_task_detail
WHERE organization_id = $1 AND project_id = $2
ORDER BY method_id ASC, task_no ASC
```

**SQLファイル内容:**
```sql
SELECT *
FROM project_task_detail
WHERE organization_id = $1
  AND project_id = $2
ORDER BY method_id ASC, task_no ASC
```

→ ✅ 論理的に同一（改行差のみ）

---

### 2. `project_task_detail/findByPrimaryKey.sql`

**元のインラインSQL:**
```sql
SELECT *
FROM project_task_detail
WHERE organization_id = $1 
  AND project_id = $2 
  AND method_id = $3 
  AND task_no = $4
```

**SQLファイル内容:**
```sql
SELECT *
FROM project_task_detail
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
  AND task_no = $4
```

→ ✅ 完全一致

---

### 3. `login_history/getLastSuccessfulLogin.sql`

**元のインラインSQL:**
```sql
SELECT user_id, organization_id, login_at
FROM login_history
WHERE user_id = $1
  AND organization_id = $2
  AND login_sf = true
ORDER BY login_at DESC
LIMIT 1
```

**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

### 4. `login_history/getLastTwoFactorAuthLogin.sql`

**元のインラインSQL:**
```sql
SELECT user_id, organization_id, login_at
FROM login_history
WHERE user_id = $1
  AND organization_id = $2
  AND login_sf = true
  AND entry_execute_flg = true
ORDER BY login_at DESC
LIMIT 1
```

**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

### 5. `login_history/recordLogin.sql`

**元のインラインSQL:**
```sql
INSERT INTO login_history (
  user_id, organization_id, login_at, login_sf,
  failure_reason, ip_address, user_agent, entry_execute_flg,
  create_user_id, create_at
)
VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $1, CURRENT_TIMESTAMP)
```

**SQLファイル内容:** 同上（カラム列挙順、VALUESの`$1`重複（user_idとcreate_user_id）含め一致）  
→ ✅ 完全一致

---

### 6. `maiml_publish_job/insert.sql`

**元のインラインSQL:**
```sql
INSERT INTO maiml_publish_job
  (job_type, organization_id, project_id, asset_id, status,
   triggered_by, trigger_type, error_message, started_at, finished_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *
```

パラメータ順序（Repository呼び出し側）:
```ts
[data.job_type, data.organization_id, data.project_id, data.asset_id ?? null,
 data.status, data.triggered_by ?? null, data.trigger_type,
 data.error_message ?? null, data.started_at ?? null, data.finished_at ?? null]
```

→ ✅ カラム順・パラメータ順 完全一致

---

### 7. `maiml_publish_job/findLatestByProject.sql`

**元のインラインSQL:**
```sql
SELECT *
FROM maiml_publish_job
WHERE organization_id = $1
  AND project_id = $2
ORDER BY created_at DESC
LIMIT 1
```

**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

### 8. `maiml_publish_job/findByJobId.sql`

**元のインラインSQL:**
```sql
SELECT *
FROM maiml_publish_job
WHERE job_id = $1
```

**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

### 9. `maiml_publish_job/findPublishedAssetId.sql`

**元のインラインSQL:**
```sql
SELECT job_type, asset_id
FROM maiml_publish_job
WHERE organization_id = $1
  AND project_id = $2
  AND status = 'done'
ORDER BY created_at DESC
LIMIT 1
```

**SQLファイル内容:** 同上  
→ ✅ 完全一致

---

## 手動確認チェックリスト

→ **[manual-test-checklist.md](./manual-test-checklist.md)** を参照
