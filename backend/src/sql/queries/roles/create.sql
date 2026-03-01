-- Role新規作成クエリ
INSERT INTO role (
  organization_id,
  role_cd,
  role_name,
  initial_screen_function_cd,
  is_active,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
)
ON CONFLICT (organization_id, role_cd) DO NOTHING
