-- project_task_detail をメソッドIDで取得（progressService.getWorkDetails() から移行）
-- $1: organization_id
-- $2: project_id
-- $3: method_id
SELECT
  organization_id,
  project_id,
  method_id,
  task_no,
  task_status,
  experiment_start_at,
  experiment_end_at,
  experiment_user_id,
  create_at,
  update_at
FROM project_task_detail
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
ORDER BY task_no ASC
