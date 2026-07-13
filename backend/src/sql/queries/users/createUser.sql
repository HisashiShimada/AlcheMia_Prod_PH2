-- organization_user新規作成クエリ
INSERT INTO organization_user (
  user_id,
  organization_id,
  user_name,
  mail_address,
  role_cd,
  is_active,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
)
RETURNING *
