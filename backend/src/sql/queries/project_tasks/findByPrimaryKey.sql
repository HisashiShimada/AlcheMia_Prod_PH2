-- 主キー（organization_id, project_id, method_id）でタスクを取得するクエリ
-- $1: organization_id, $2: project_id, $3: method_id
SELECT *
FROM project_task
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
