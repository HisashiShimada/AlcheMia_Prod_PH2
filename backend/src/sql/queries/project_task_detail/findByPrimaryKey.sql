-- project_task_detail: 主キーでタスク詳細を1件取得
-- $1: organization_id
-- $2: project_id
-- $3: method_id
-- $4: task_no
SELECT *
FROM project_task_detail
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
  AND task_no = $4
