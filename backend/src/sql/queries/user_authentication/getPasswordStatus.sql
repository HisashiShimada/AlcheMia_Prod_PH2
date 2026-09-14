-- パスワード状態を取得するクエリ
-- \$1: user_id, \$2: organization_id
SELECT is_temporary_flg
FROM user_authentication
WHERE user_id = $1
  AND organization_id = $2
