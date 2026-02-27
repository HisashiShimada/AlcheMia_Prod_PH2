-- Corporationアクティブ状態更新クエリ
UPDATE corporation
SET is_active = $1,
    update_user_id = $2,
    update_at = NOW()
WHERE corporation_id = $3
RETURNING
  corporation_id,
  corporation_name,
  is_active,
  create_at,
  update_at
