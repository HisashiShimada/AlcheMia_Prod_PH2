-- namespace_id に紐づくスコープ名（グループ名・ユーザー名）を取得
-- 重複エラー時のエラーメッセージに使用
-- $1: organization_id
-- $2: namespace_id
SELECT
  COALESCE(og.organization_group_name, ou.user_name, n.scope_key) AS scope_name
FROM namespace n
LEFT JOIN organization_group og
  ON og.organization_id = n.organization_id
  AND og.organization_group_cd = n.scope_key
LEFT JOIN organization_user ou
  ON ou.organization_id = n.organization_id
  AND ou.user_id = n.scope_key
WHERE n.organization_id = $1
  AND n.namespace_id    = $2
