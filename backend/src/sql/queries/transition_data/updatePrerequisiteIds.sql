-- transition_data: prerequisite_transition_ids 更新
-- 実験計画保存時に前提トランジションID配列を同期する
-- task_no > 0 の実績行のみ対象（task_no=0 は順序管理行で status=NULL のため除外）
--
-- Parameters:
--   $1: organization_id (UUID)
--   $2: project_id (UUID)
--   $3: method_id (VARCHAR)
--   $4: transition_id (VARCHAR)
--   $5: prerequisite_transition_ids (TEXT[])
--   $6: update_user_id (VARCHAR)

UPDATE transition_data
SET
  prerequisite_transition_ids = $5,
  update_user_id              = $6,
  update_at                   = CURRENT_TIMESTAMP
WHERE organization_id = $1
  AND project_id      = $2
  AND method_id       = $3
  AND transition_id   = $4
  AND task_no         > 0
