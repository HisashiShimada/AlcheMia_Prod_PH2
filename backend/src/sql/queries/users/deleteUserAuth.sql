-- user_authentication物理削除クエリ
DELETE FROM user_authentication
WHERE organization_id = $1
  AND user_id = $2
