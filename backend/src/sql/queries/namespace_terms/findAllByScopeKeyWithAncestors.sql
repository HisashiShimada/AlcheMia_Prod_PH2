-- scopeKey（organization_group_cd）とその祖先グループに紐づく用語を取得
-- WITH RECURSIVE で先祖CDを全列挙し、それらの scope_key を持つ namespace の用語を返す
WITH RECURSIVE ancestors AS (
  -- 基底ケース: 指定したグループCD
  SELECT
    organization_group_cd,
    parent_group_cd,
    organization_id,
    0 AS depth
  FROM organization_group
  WHERE organization_id = $1
    AND organization_group_cd = $2

  UNION ALL

  -- 再帰ケース: 親を辿る
  SELECT
    og.organization_group_cd,
    og.parent_group_cd,
    og.organization_id,
    ancestors.depth + 1
  FROM organization_group og
  INNER JOIN ancestors
    ON og.organization_id = ancestors.organization_id
    AND og.organization_group_cd = ancestors.parent_group_cd
)
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
  , t.has_directive_term           AS "hasDirectiveTerm"
  , n.scope_key                    AS "scopeKey"
FROM namespace_term t
JOIN namespace n
  ON n.organization_id = t.organization_id
 AND n.namespace_id    = t.namespace_id
WHERE t.organization_id = $1
  AND n.scope_key IN (SELECT organization_group_cd FROM ancestors)
ORDER BY t.prefix ASC, t.localname ASC
