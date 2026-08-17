-- prefix に紐づくスコープ名（チーム名・ユーザー名）を取得
-- 重複エラー時のエラーメッセージに使用
SELECT
  COALESCE(og.organization_group_name, ou.user_name, p.prefix) AS scope_name
FROM prefix p
INNER JOIN namespace n
  ON p.organization_id = n.organization_id
  AND p.namespace_id = n.namespace_id
LEFT JOIN organization_group og
  ON og.organization_id = p.organization_id
  AND og.organization_group_cd = n.scope_key
LEFT JOIN organization_user ou
  ON ou.organization_id = p.organization_id
  AND ou.user_id = n.scope_key
WHERE p.organization_id = $1
  AND p.prefix = $2
LIMIT 1
