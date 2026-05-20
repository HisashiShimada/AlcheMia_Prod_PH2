-- チェックアウト保持者のユーザー名を取得するクエリ
-- $1: organization_id, $2: user_id
SELECT user_name
FROM organization_user
WHERE organization_id = $1
  AND user_id = $2
