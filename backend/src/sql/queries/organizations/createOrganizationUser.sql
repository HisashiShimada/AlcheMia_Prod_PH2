-- 組織利用者新規作成
INSERT INTO organization_user (
  user_id,
  organization_id,
  user_name,
  role_cd,
  mail_address,
  department_cd,
  is_active,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
)
