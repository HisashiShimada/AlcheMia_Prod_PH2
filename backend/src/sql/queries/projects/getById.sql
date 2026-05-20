-- プロジェクトIDで単一プロジェクトを取得するクエリ
-- $1: project_id, $2: organization_id
SELECT * FROM project
WHERE project_id = $1
  AND organization_id = $2
