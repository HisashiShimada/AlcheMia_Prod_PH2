-- 組織CDの存在確認
SELECT EXISTS (
  SELECT 1
  FROM organization
  WHERE organization_cd = $1
) AS exists
