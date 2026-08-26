-- transition_data の is_recorded フラグを更新
-- 実験データ保存完了後に記録済みフラグを TRUE に設定する
--
-- Parameters:
--   $1: is_recorded (BOOLEAN) - 記録済みフラグ値
--   $2: update_user_id (VARCHAR) - 更新者ユーザーID
--   $3: organization_id (UUID)
--   $4: project_id (VARCHAR)
--   $5: method_id (VARCHAR)
--   $6: task_no (NUMERIC)
--   $7: transition_id (VARCHAR)

UPDATE transition_data
SET
  is_recorded = $1,
  update_user_id = $2,
  update_at = CURRENT_TIMESTAMP
WHERE
  organization_id = $3
  AND project_id = $4
  AND method_id = $5
  AND task_no = $6
  AND transition_id = $7
