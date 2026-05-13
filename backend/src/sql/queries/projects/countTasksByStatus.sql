-- プロジェクトのタスク統計情報取得（task_status 別の件数）
-- $1: organization_id
-- $2: project_id
SELECT 
  task_status,
  COUNT(*) as count
FROM project_task_detail
WHERE organization_id = $1
  AND project_id = $2
GROUP BY task_status
