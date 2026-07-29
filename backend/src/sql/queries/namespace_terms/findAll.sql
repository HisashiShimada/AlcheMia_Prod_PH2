-- 全組織の全用語を取得（認証なし用・開発時のみ使用）
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
ORDER BY t.prefix ASC, t.localname ASC
