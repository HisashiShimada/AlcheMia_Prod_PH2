-- experiment_plan: 1タスク分の実験計画を UPSERT
-- 引数: $1=organization_id, $2=project_id, $3=method_id, $4=task_no,
--       $5=planned_values(jsonb), $6=create_user_id, $7=update_user_id
INSERT INTO experiment_plan (
  organization_id,
  project_id,
  method_id,
  task_no,
  planned_values,
  create_user_id,
  create_at,
  update_user_id,
  update_at
) VALUES ($1, $2, $3, $4, $5::jsonb, $6, CURRENT_TIMESTAMP, $7, CURRENT_TIMESTAMP)
ON CONFLICT (organization_id, project_id, method_id, task_no)
DO UPDATE SET
  planned_values = EXCLUDED.planned_values,
  update_user_id = EXCLUDED.update_user_id,
  update_at      = CURRENT_TIMESTAMP
RETURNING *
