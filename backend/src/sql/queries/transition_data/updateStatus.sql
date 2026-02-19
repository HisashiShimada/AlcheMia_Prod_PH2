-- トランジションステータス更新
-- 指定されたトランジションのステータス、進捗率、更新者を更新
UPDATE transition_data
SET status = $1,
    progress_rate = $2,
    updated_by = $3,
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = $4
  AND project_id = $5
  AND method_id = $6
  AND task_no = $7
  AND transition_id = $8
RETURNING
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
