-- Attribute新規作成クエリ
-- 主キー: (organization_id, attribute_name)
INSERT INTO attribute (
  organization_id,
  attribute_name,
  attribute_value,
  attribute_remark,
  department_cd,
  is_active,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $7, NOW(), NOW()
)
RETURNING
  attribute_name,
  attribute_value,
  attribute_remark,
  department_cd,
  is_active,
  update_at
