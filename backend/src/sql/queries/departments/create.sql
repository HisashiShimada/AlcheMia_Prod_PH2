-- Department新規作成クエリ
INSERT INTO department (
  organization_id,
  department_cd,
  department_name,
  is_active,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, NOW(), NOW()
)
RETURNING
  organization_id,
  department_cd,
  department_name,
  is_active,
  create_at,
  update_at
