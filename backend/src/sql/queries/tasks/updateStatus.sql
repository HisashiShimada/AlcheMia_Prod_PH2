-- タスクステータス更新
-- 使用箇所: taskService.ts - updateTaskStatus()
-- パラメータ: 
--   $1=newStatusNum (task_status)
--   $2=organizationId
--   $3=projectId
--   $4=methodId
--   $5=taskNo
--   $6=currentUpdateAt (楽観的ロック用)
--   $7=TaskStatusEnum.IN_PROGRESS (1)
--   $8=TaskStatusEnum.COMPLETED (3)
-- 用途: タスクステータスを更新し、タイムスタンプを自動設定

UPDATE project_task
SET 
  task_status = $1,
  experiment_start_at = CASE 
    WHEN $1 = $7 AND experiment_start_at IS NULL 
    THEN NOW() 
    ELSE experiment_start_at 
  END,
  experiment_end_at = CASE 
    WHEN $1 = $8
    THEN NOW() 
    ELSE experiment_end_at 
  END,
  update_at = NOW()
WHERE organization_id = $2
  AND project_id = $3
  AND method_id = $4
  AND task_no = $5
  AND update_at = $6
RETURNING 
  organization_id,
  project_id,
  method_id,
  task_no,
  task_status,
  experiment_user_id,
  experiment_start_at,
  experiment_end_at,
  update_at
