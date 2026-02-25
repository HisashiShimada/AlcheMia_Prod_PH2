-- ユーザーIDの存在チェック
SELECT EXISTS (
  SELECT 1
  FROM organization_user
  WHERE organization_id = $1
    AND user_id = $2
) as exists
