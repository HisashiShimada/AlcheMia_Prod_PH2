-- トランジションステータス更新
-- 指定されたトランジションのステータス、更新者を更新
UPDATE transition_data
SET status = $1,
    update_user_id = $2,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = $3
  AND project_id = $4
  AND method_id = $5
  AND task_no = $6
  AND transition_id = $7
RETURNING
  organization_id,
  project_id,
  method_id,
  task_no,
  transition_id,
  status,
  update_user_id,
  update_at,
  create_at
