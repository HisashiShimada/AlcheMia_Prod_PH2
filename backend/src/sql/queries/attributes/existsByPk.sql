-- 主キー（attribute_name + attribute_value）の存在確認クエリ
-- $1: organization_id, $2: attribute_name, $3: attribute_value
SELECT EXISTS (
  SELECT 1 FROM attribute
  WHERE organization_id = $1 AND attribute_name = $2 AND attribute_value = $3
) AS exists
