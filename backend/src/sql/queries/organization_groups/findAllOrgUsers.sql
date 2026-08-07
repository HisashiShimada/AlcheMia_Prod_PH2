-- organization_user 一覧取得クエリ（グループメンバー選択用）
-- 組織内のアクティブなユーザーを全件取得する
-- DDL: docs/design/db/ddl/organization_user.sql
SELECT
  user_id
  , user_name
  , mail_address
FROM organization_user
WHERE organization_id = $1
  AND is_active = TRUE
ORDER BY user_name ASC
