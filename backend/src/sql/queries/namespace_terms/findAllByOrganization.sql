-- 組織に紐づく全用語を取得
-- フロントエンド用に整形済みの形式で返す
-- UNION ALL で固定UUID (00000000-...) の Alchemia システム用語も常に含める
-- namespace テーブルを JOIN して scope_key（ツリーバッジ計算用）と scopeName（チーム名表示用）を取得する
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
  , COALESCE(og.organization_group_name, ou.user_name, '') AS "scopeName"
FROM namespace_term t
JOIN namespace n
  ON n.organization_id = t.organization_id
  AND n.namespace_id = t.namespace_id
LEFT JOIN organization_group og
  ON og.organization_id = t.organization_id
  AND og.organization_group_cd = n.scope_key
LEFT JOIN organization_user ou
  ON ou.organization_id = t.organization_id
  AND ou.user_id = n.scope_key
WHERE t.organization_id = $1
UNION ALL
SELECT
  t.prefix || ':' || t.localname   AS "id"
  , t.namespace_id                  AS "namespaceId"
  , t.prefix || ':' || t.localname  AS qname
  , t.prefix                        AS prefix
  , t.localname                     AS "localName"
  , COALESCE(t.display_name, '')    AS "displayName"
  , COALESCE(t.description, '')     AS description
  , COALESCE(t.xsi_type, 'stringType') AS type
  , COALESCE(t.units, '')           AS "unitHint"
  , t.is_active                     AS "isActive"
  , NULL::text                      AS "scopeKey"
  , NULL::text                      AS "scopeName"
FROM namespace_term t
WHERE t.organization_id = '00000000-0000-0000-0000-000000000000'
ORDER BY prefix ASC, "localName" ASC
