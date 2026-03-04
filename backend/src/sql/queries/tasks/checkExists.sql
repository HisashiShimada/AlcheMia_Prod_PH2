-- タスクの存在確認
-- project_task と project_task_detail を JOIN してタスク番号で存在確認する
-- （project_task には task_no カラムが存在しないため JOIN が必須）
-- 
-- Parameters:
--   $1: organization_id (UUID) - 組織ID（マルチテナント分離）
--   $2: project_id (VARCHAR(20)) - プロジェクトID
--   $3: method_id (TEXT) - メソッドID
--   $4: task_no (INTEGER) - タスク番号
-- 
-- Returns:
--   task_no（見つかった場合）、見つからない場合は0件

SELECT 
  ptd.task_no
FROM project_task pt
JOIN project_task_detail ptd
  ON pt.organization_id = ptd.organization_id
  AND pt.project_id = ptd.project_id
  AND pt.method_id = ptd.method_id
WHERE ptd.organization_id = $1
  AND ptd.project_id = $2
  AND ptd.method_id = $3
  AND ptd.task_no = $4
LIMIT 1;
