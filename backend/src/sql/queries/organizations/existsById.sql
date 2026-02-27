-- 組織IDの存在確認
SELECT EXISTS (
  SELECT 1
  FROM organization
  WHERE organization_id = $1
) AS exists
