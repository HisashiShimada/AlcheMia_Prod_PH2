-- 複数の scopeKey（organization_group_cd または user_id）に紐づく用語を一括取得
-- company ノード選択時など、ツリーに表示されている複数グループの用語をまとめて返す
-- $1: organization_id, $2: scope_key の配列（pg-promise の $2:csv 形式）
SELECT
  t.prefix || ':' || t.localname   AS "id"
  , t.namespace_id                 AS "namespaceId"
  , t.prefix || ':' || t.localname AS qname
  , t.prefix                       AS prefix
  , t.localname                    AS "localName"
  , COALESCE(t.display_name, '')   AS "displayName"
  , COALESCE(t.description, '')    AS description
  , COALESCE(t.xsi_type, 'stringType') AS type
  , COALESCE(t.units, '')          AS "unitHint"
  , t.is_active                    AS "isActive"
  , n.scope_key                    AS "scopeKey"
FROM namespace_term t
JOIN namespace n
  ON n.organization_id = t.organization_id
 AND n.namespace_id    = t.namespace_id
WHERE t.organization_id = $1
  AND n.scope_key = ANY($2)
ORDER BY t.prefix ASC, t.localname ASC
