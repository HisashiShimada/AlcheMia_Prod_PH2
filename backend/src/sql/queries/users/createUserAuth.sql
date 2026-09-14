-- user_authentication新規登録クエリ
INSERT INTO user_authentication (
  user_id,
  organization_id,
  password,
  is_temporary_flg,
  password_expires_at,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
)
