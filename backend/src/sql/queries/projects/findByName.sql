-- プロジェクト名から全カラム取得
-- $1: organization_id
-- $2: project_name
SELECT *
FROM project
WHERE organization_id = $1
  AND project_name = $2
