-- プロジェクト名からプロジェクトIDを取得する
SELECT project_id
FROM projects
WHERE project_name = $1 AND organization_id = $2
