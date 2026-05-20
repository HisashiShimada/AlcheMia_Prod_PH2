-- プロジェクト名取得クエリ（指示削除時の再採番用）
-- $1: organization_id, $2: project_id
SELECT project_name
FROM project
WHERE organization_id = $1
  AND project_id = $2
