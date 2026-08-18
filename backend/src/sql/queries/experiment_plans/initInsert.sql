-- experiment_plan: タスク登録時の初期レコードを INSERT（既存データは上書きしない）
-- 引数: $1=organization_id, $2=project_id, $3=method_id, $4=task_no,
--       $5=create_user_id, $6=update_user_id
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
) VALUES ($1, $2, $3, $4, '{}'::jsonb, $5, CURRENT_TIMESTAMP, $6, CURRENT_TIMESTAMP)
ON CONFLICT (organization_id, project_id, method_id, task_no)
DO NOTHING
