-- ロールCDが特定機能にアクセス可能かチェックするクエリ
-- $1: role_cd, $2: organization_id, $3: function_cd
SELECT EXISTS(
  SELECT 1 FROM role_permission
  WHERE role_cd = $1
    AND organization_id = $2
    AND function_cd = $3
) AS exists
