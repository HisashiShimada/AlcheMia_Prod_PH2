-- 祖先グループスコープに同一 prefix:localname が存在するか検索
-- 登録先スコープ（$2）の祖先グループを WITH RECURSIVE で列挙し、
-- そのいずれかのスコープに同一 prefix:localname が存在すれば1件返す
-- ※ $2（登録先スコープ自身）は除外する（登録先は findTermInScope.sql で別途チェック済み）
-- $1: organization_id
-- $2: scope_key（登録先の organization_group_cd）
-- $3: prefix
-- $4: localname
WITH RECURSIVE ancestors AS (
  -- 基底ケース: 登録先グループの親グループから開始（自スコープは除外）
  SELECT
    og.organization_group_cd,
    og.parent_group_cd,
    og.organization_id
  FROM organization_group og
  WHERE og.organization_id = $1
    AND og.organization_group_cd = (
      SELECT parent_group_cd
      FROM organization_group
      WHERE organization_id = $1
        AND organization_group_cd = $2
      LIMIT 1
    )

  UNION ALL

  -- 再帰ケース: さらに上の親を辿る
  SELECT
    og.organization_group_cd,
    og.parent_group_cd,
    og.organization_id
  FROM organization_group og
  INNER JOIN ancestors a
    ON og.organization_id = a.organization_id
    AND og.organization_group_cd = a.parent_group_cd
)
SELECT
  t.prefix || ':' || t.localname  AS qname
  , t.namespace_id                 AS "namespaceId"
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
  AND t.prefix    = $3
  AND t.localname = $4
LIMIT 1
