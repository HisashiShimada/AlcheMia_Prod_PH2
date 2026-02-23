-- タスク取得（排他ロック付き）
-- 使用箇所: taskService.ts - updateTaskStatus()
-- パラメータ: $1=organizationId, $2=projectId, $3=methodId, $4=taskNo
-- 用途: 楽観的ロック制御のためにタスクを排他取得（FOR UPDATE）
-- 修正日: 2026-02-23 - project_taskからproject_task_detailに変更

SELECT 
  ptd.organization_id,
  ptd.project_id,
  p.project_name,
  ptd.method_id,
  ptd.task_no,
  ptd.task_status,
  to_char(DATE_TRUNC('milliseconds', ptd.update_at AT TIME ZONE 'Asia/Tokyo' AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as update_at,
  ptd.experiment_user_id,
  ou.user_name as experiment_user_name
FROM project_task_detail ptd
LEFT JOIN project p 
  ON p.project_id = ptd.project_id 
  AND p.organization_id = ptd.organization_id
LEFT JOIN organization_user ou
  ON ou.user_id = ptd.experiment_user_id
  AND ou.organization_id = ptd.organization_id
WHERE ptd.organization_id = $1
  AND ptd.project_id = $2
  AND ptd.method_id = $3
  AND ptd.task_no = $4
FOR UPDATE OF ptd
