-- experiment_instruction_detail 実績値のみ更新（訂正保存時）
--
-- 訂正保存（correctRecord）時に呼び出す。
-- actual_value のみを更新する。レコードが存在しない場合は何もしない（UPDATE のみ）。
--
-- パラメータ:
--   $1  organization_id
--   $2  project_id
--   $3  method_id
--   $4  task_no
--   $5  transition_id
--   $6  template_id
--   $7  prop_key
--   $8  actual_value   （NULL 可）
--   $9  update_user_id

UPDATE experiment_instruction_detail
SET
    actual_value  = $8,
    update_user_id = $9,
    update_at      = NOW()
WHERE organization_id = $1
  AND project_id      = $2
  AND method_id       = $3
  AND task_no         = $4
  AND transition_id   = $5
  AND template_id     = $6
  AND prop_key        = $7
