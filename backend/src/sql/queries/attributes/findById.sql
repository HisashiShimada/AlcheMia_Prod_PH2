-- Attributeマスタ主キー検索
-- organization_id + attribute_name + attribute_value で検索
SELECT
  a.attribute_name,
  a.attribute_value,
  a.attribute_remark,
  a.department_cd,
  d.department_name,
  a.is_active,
  a.update_at
FROM attribute a
LEFT JOIN department d
  ON a.organization_id = d.organization_id
  AND a.department_cd = d.department_cd
WHERE a.organization_id = $1
  AND a.attribute_name  = $2
  AND a.attribute_value = $3
