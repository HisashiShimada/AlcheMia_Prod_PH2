-- Role存在確認クエリ
SELECT EXISTS (
  SELECT 1
  FROM role
  WHERE organization_id = $1
    AND role_cd = $2
) AS exists
