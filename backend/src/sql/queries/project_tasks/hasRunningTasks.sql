-- 実行中タスク（task_status=1）が存在するかチェック
-- $1: organization_id
-- $2: project_id
SELECT EXISTS(
  SELECT 1 
  FROM project_task_detail
  WHERE organization_id = $1
    AND project_id = $2
    AND task_status = 1
) as has_running_tasks
