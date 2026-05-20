-- Creatorのアクティブ状態を更新（corporation_idスコープ）
UPDATE creator
SET is_active = $1,
    update_user_id = $2,
    update_at = NOW()
WHERE corporation_id = $3
  AND creator_id = $4
RETURNING *
