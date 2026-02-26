-- Corporation新規作成クエリ
INSERT INTO corporation (
  corporation_id,
  corporation_name,
  is_active,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, NOW(), NOW()
)
RETURNING
  corporation_id,
  corporation_name,
  is_active,
  create_at,
  update_at
