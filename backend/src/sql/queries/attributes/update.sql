-- Attributeマスタ更新
UPDATE attribute
SET
  attribute_remark      = $4,
  organization_group_cd = $5,
  is_active             = $6,
  update_user_id        = $7,
  update_at             = NOW()
WHERE organization_id = $1
  AND attribute_name  = $2
  AND attribute_value = $3
RETURNING
  attribute_name,
  attribute_value,
  attribute_remark,
  organization_group_cd,
  NULL AS organization_group_name,
  is_active,
  update_at
