-- 組織に紐づく全用語を取得
-- フロントエンド用に整形済みの形式で返す
-- UNION ALL で固定UUID (00000000-...) の Alchemia システム用語も常に含める
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
UNION ALL
SELECT
  t.prefix || ':' || t.localname  AS qname
  , t.prefix                       AS prefix
  , t.localname                    AS "localName"
  , COALESCE(t.display_name, '')   AS "displayName"
  , COALESCE(t.description, '')    AS description
  , COALESCE(t.xsi_type, 'stringType') AS type
  , COALESCE(t.units, '')          AS "unitHint"
  , t.is_active                    AS "isActive"
FROM namespace_term t
WHERE t.organization_id = '00000000-0000-0000-0000-000000000000'
ORDER BY prefix ASC, "localName" ASC
