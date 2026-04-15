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
--   $9=userId (実験作業者ID)
-- 用途: タスクステータスを更新し、タイムスタンプを自動設定
-- 修正日: 2026-02-23 - project_taskからproject_task_detailに変更、experiment_user_id設定を追加

UPDATE project_task_detail
SET 
  task_status = $1,
  experiment_user_id = CASE 
    WHEN $1 = $7 AND experiment_user_id IS NULL 
    THEN $9
    ELSE experiment_user_id 
  END,
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
  AND to_char(DATE_TRUNC('milliseconds', update_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') = $6
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
