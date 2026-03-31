-- 組織CDの存在確認（特定IDを除外：更新時に使用、大文字・小文字を区別しない）
SELECT EXISTS (
  SELECT 1
  FROM organization
  WHERE LOWER(organization_cd) = LOWER($1)
    AND organization_id != $2
) AS exists
