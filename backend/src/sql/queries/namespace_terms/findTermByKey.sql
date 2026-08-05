-- namespace_term を主キー（organization_id / prefix / localname）で1件取得
-- create() / update() / toggleActive() 後の SELECT に共通使用
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
FROM namespace_term t
WHERE t.organization_id = $1
  AND t.prefix = $2
  AND t.localname = $3
