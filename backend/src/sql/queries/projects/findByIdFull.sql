-- プロジェクトIDから全カラム取得（checkout_status含む）
-- $1: organization_id
-- $2: project_id
SELECT *
FROM project
WHERE organization_id = $1
  AND project_id = $2
