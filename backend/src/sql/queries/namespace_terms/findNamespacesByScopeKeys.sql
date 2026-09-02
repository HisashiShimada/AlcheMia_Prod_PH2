-- 複数の scopeKey（organization_group_cd または user_id）に紐づく Prefix（namespace）を一括取得
-- company ノード選択時など、ツリーに表示されている複数グループの Prefix をまとめて返す
-- $1: organization_id, $2: scope_key の配列
SELECT
  p.prefix
  , n.uri
  , p.description                                                   AS description
  , n.scope_key                                                     AS "scopeKey"
  , COALESCE(og.organization_group_name, ou.user_name, '')          AS "scopeName"
  , p.is_active                                                     AS "isActive"
FROM namespace n
INNER JOIN prefix p
  ON p.organization_id = n.organization_id
  AND p.namespace_id = n.namespace_id
LEFT JOIN organization_group og
  ON og.organization_id = n.organization_id
  AND og.organization_group_cd = n.scope_key
LEFT JOIN organization_user ou
  ON ou.organization_id = n.organization_id
  AND ou.user_id = n.scope_key
WHERE n.organization_id = $1
  AND n.scope_key = ANY($2)
ORDER BY p.prefix ASC
