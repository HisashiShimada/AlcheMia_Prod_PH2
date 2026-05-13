-- プロジェクト基本情報取得（project_id, project_name のみ）
-- $1: organization_id
-- $2: project_id
SELECT project_id, project_name
FROM project
WHERE organization_id = $1
  AND project_id = $2
