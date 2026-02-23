-- トランジションID検索
-- 指定されたトランジションの完全な情報を取得
SELECT
  organization_id,
  project_id,
  method_id,
  task_no,
  transition_id,
  status,
  progress_rate,
  comment,
  updated_by,
  updated_at,
  created_at
FROM transition_data
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
  AND task_no = $4
  AND transition_id = $5
