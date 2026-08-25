-- scope_key と prefix の両方に対応する namespace_id を取得
-- namespace テーブルの scope_key を使って正しい namespace_id を特定する
-- $1: organization_id
-- $2: scope_key（organization_group_cd または user_id）
-- $3: prefix
SELECT p.namespace_id
FROM prefix p
JOIN namespace n
  ON n.organization_id = p.organization_id
  AND n.namespace_id = p.namespace_id
WHERE p.organization_id = $1
  AND n.scope_key = $2
  AND p.prefix = $3
LIMIT 1
