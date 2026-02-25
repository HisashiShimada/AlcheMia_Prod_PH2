-- Userのアクティブ状態を更新
UPDATE organization_user
SET is_active = $1,
    update_user_id = $2,
    update_at = NOW()
WHERE organization_id = $3
  AND user_id = $4
RETURNING *
