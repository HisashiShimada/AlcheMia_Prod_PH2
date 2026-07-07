-- experiment_plan: 指定プロジェクトの全レコード取得（全メソッド・全タスク）
-- 引数: $1=organization_id, $2=project_id
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
ORDER BY method_id ASC, task_no ASC
