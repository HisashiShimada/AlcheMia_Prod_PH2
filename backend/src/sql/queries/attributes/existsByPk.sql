-- Attributeマスタ 主キー存在確認
SELECT EXISTS (
  SELECT 1
  FROM attribute
  WHERE organization_id = $1
    AND attribute_name  = $2
    AND attribute_value = $3
) AS exists
