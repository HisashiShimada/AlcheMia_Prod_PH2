-- 組織に紐づくアクティブな用語のみを取得（バリデーション用）
-- is_active = TRUE の用語のみを返す
-- findAllByOrganization.sql の変形で scope_key / scopeName は含まない（バリデーション用途のため不要）
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
FROM namespace_term t
JOIN namespace n
  ON n.organization_id = t.organization_id
 AND n.namespace_id    = t.namespace_id
WHERE t.organization_id = $1
  AND t.is_active = TRUE
ORDER BY prefix ASC, "localName" ASC
