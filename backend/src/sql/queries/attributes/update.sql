-- Attribute更新クエリ
-- 主キー: (organization_id, attribute_name, attribute_value)
UPDATE attribute SET
  attribute_remark = $4,
  department_cd = $5,
  is_active = $6,
  update_user_id = $7,
  update_at = NOW()
WHERE organization_id = $1
  AND attribute_name = $2
  AND attribute_value = $3
RETURNING
  attribute_name,
  attribute_value,
  attribute_remark,
  department_cd,
  is_active,
  update_at
