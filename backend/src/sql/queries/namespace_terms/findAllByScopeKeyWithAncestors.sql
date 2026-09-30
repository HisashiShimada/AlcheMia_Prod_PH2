-- scopeKey（organization_group_cd）とその祖先グループに紐づく用語を取得
-- WITH RECURSIVE で先祖CDを全列挙し、それらの scope_key を持つ namespace の用語を返す
-- 同一 prefix:localname が複数スコープに存在する場合は depth が小さい（現在のスコープに近い）方を優先する
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
),
ranked AS (
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
    , a.depth                        AS depth
    , ROW_NUMBER() OVER (
        PARTITION BY t.prefix, t.localname
        ORDER BY a.depth ASC
      ) AS rn
  FROM namespace_term t
  JOIN namespace n
    ON n.organization_id = t.organization_id
   AND n.namespace_id    = t.namespace_id
  JOIN ancestors a
    ON a.organization_group_cd = n.scope_key
  WHERE t.organization_id = $1
)
SELECT
  "id"
  , "namespaceId"
  , qname
  , prefix
  , "localName"
  , "displayName"
  , description
  , type
  , "unitHint"
  , "isActive"
  , "hasDirectiveTerm"
  , "scopeKey"
FROM ranked
WHERE rn = 1
ORDER BY prefix ASC, "localName" ASC
