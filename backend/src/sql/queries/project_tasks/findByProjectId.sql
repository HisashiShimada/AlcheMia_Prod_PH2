-- project_task 一覧取得（progressService.getWorkDetails() から移行）
-- $1: project_id
-- $2: organization_id
SELECT
  organization_id,
  project_id,
  method_id,
  experiment_order,
  experiment_condition,
  attempts_count,
  create_at,
  update_at
FROM project_task
WHERE project_id = $1
  AND organization_id = $2
ORDER BY experiment_order ASC
