-- プロジェクト名からプロジェクト情報を取得
-- 使用箇所: 
--   - progressController.ts - updateTaskStatus()
--   - progressController.ts - getWorkerTasks()
-- パラメータ: $1=projectName, $2=organizationId

SELECT 
  project_id, 
  project_name, 
  project_status
FROM project
WHERE project_name = $1 
  AND organization_id = $2
