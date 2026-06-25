-- experiment_plan: 指定メソッドの全タスク削除
-- 引数: $1=organization_id, $2=project_id, $3=method_id
DELETE FROM experiment_plan
WHERE organization_id = $1
  AND project_id      = $2
  AND method_id       = $3
