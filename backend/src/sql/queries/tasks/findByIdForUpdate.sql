-- タスク取得（排他ロック付き）
-- 使用箇所: taskService.ts - updateTaskStatus()
-- パラメータ: $1=organizationId, $2=projectId, $3=methodId, $4=taskNo
-- 用途: 楽観的ロック制御のためにタスクを排他取得（FOR UPDATE）

SELECT 
  pt.organization_id,
  pt.project_id,
  p.project_name,
  pt.method_id,
  pt.task_no,
  pt.task_status,
  pt.update_at,
  pt.experiment_user_id,
  ou.user_name as experiment_user_name
FROM project_task pt
LEFT JOIN project p 
  ON p.project_id = pt.project_id 
  AND p.organization_id = pt.organization_id
LEFT JOIN organization_user ou
  ON ou.user_id = pt.experiment_user_id
  AND ou.organization_id = pt.organization_id
WHERE pt.organization_id = $1
  AND pt.project_id = $2
  AND pt.method_id = $3
  AND pt.task_no = $4
FOR UPDATE
