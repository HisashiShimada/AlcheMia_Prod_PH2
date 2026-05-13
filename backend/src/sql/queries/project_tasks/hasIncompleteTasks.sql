-- 未完了タスク（task_status NOT IN (3, 4)）が存在するかチェック
-- $1: organization_id
-- $2: project_id
SELECT EXISTS(
  SELECT 1 
  FROM project_task_detail
  WHERE organization_id = $1 
    AND project_id = $2 
    AND task_status NOT IN (3, 4)
) as has_incomplete_tasks
