-- トランジションの最新実験記録取得
-- 指定されたトランジションの最新レコード（updated_at降順で1件）を取得
SELECT
  organization_id,
  project_id,
  method_id,
  task_no,
  transition_id,
  status,
  progress_rate,
  is_recorded,
  update_user_id,
  update_at,
  create_at
FROM transition_data
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
  AND task_no = $4
  AND transition_id = $5
ORDER BY update_at DESC
LIMIT 1
