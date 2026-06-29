-- Attributeマスタ新規作成
INSERT INTO attribute (
  organization_id,
  attribute_name,
  attribute_value,
  attribute_remark,
  department_cd,
  is_active,
  create_user_id,
  create_at,
  update_user_id,
  update_at
) VALUES (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  NOW(),
  $7,
  NOW()
)
RETURNING
  attribute_name,
  attribute_value,
  attribute_remark,
  department_cd,
  NULL AS department_name,
  is_active,
  update_at
