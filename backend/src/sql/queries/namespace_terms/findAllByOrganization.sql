-- 組織に紐づく全用語を取得
-- フロントエンド用に整形済みの形式で返す
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
FROM namespace_term t
WHERE t.organization_id = $1
ORDER BY t.prefix ASC, t.localname ASC
