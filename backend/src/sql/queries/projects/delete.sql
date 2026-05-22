-- プロジェクトを削除するクエリ
-- $1: organization_id, $2: project_id
DELETE FROM project
WHERE organization_id = $1
  AND project_id = $2
