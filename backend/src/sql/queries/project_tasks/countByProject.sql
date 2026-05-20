-- プロジェクト内のタスク数を取得するクエリ
-- $1: organization_id, $2: project_id
SELECT COUNT(*) as count
FROM project_task
WHERE organization_id = $1
  AND project_id = $2
