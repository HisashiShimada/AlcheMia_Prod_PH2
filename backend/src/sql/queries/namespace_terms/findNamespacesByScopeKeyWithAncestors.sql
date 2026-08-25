-- scopeKey（organization_group_cd）とその祖先グループに紐づく Prefix（namespace）を取得
-- WITH RECURSIVE で先祖CDを全列挙し、それらの scope_key を持つ namespace を返す
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
  n.namespace_id   AS "namespaceId"
  , p.prefix       AS prefix
  , n.uri          AS uri
  , p.description  AS description
  , n.scope_key    AS "scopeKey"
  , g.organization_group_name AS "scopeName"
FROM namespace n
JOIN prefix p
  ON p.organization_id = n.organization_id
 AND p.namespace_id    = n.namespace_id
LEFT JOIN organization_group g
  ON g.organization_id     = n.organization_id
 AND g.organization_group_cd = n.scope_key
WHERE n.organization_id = $1
  AND n.scope_key IN (SELECT organization_group_cd FROM ancestors)
  AND n.global_flg = FALSE
ORDER BY p.prefix ASC
