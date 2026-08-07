-- 指定した scope_key を持つ namespace レコードの存在確認
-- $1: organization_id
-- $2: scope_key（organization_group_cd など）
SELECT EXISTS (
  SELECT 1
  FROM namespace
  WHERE organization_id = $1
    AND scope_key = $2
) AS exists
