-- Corporation更新クエリ
-- $1: corporation_id, $2: corporation_name (null=変更なし), $3: is_active (null=変更なし), $4: update_user_id
UPDATE corporation
SET
  corporation_name = COALESCE($2, corporation_name),
  is_active        = COALESCE($3, is_active),
  update_user_id   = $4,
  update_at        = NOW()
WHERE corporation_id = $1
RETURNING
  corporation_id,
  corporation_name,
  is_active,
  create_at,
  update_at
