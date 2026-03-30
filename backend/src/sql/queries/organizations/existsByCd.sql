-- 組織CDの存在確認（大文字・小文字を区別しない）
SELECT EXISTS (
  SELECT 1
  FROM organization
  WHERE LOWER(organization_cd) = LOWER($1)
) AS exists
