-- プロジェクト名を取得
SELECT project_name
FROM project
WHERE organization_id = $1
  AND project_id = $2
