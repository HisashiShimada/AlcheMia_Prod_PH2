-- experiment_plan: 指定メソッドの全タスク取得
-- 引数: $1=organization_id, $2=project_id, $3=method_id
SELECT
  organization_id,
  project_id,
  method_id,
  task_no,
  planned_values,
  create_user_id,
  create_at,
  update_user_id,
  update_at
FROM experiment_plan
WHERE organization_id = $1
  AND project_id      = $2
  AND method_id       = $3
ORDER BY task_no ASC
