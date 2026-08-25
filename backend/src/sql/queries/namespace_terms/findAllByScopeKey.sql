-- scopeKey（organization_group_cd または user_id）に紐づく用語を取得
-- 対象スコープの名前空間に属する用語を返す
-- （グローバル名前空間はファイルサーバ管理に移行したため global_flg 条件を削除）
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
  AND n.scope_key = $2
ORDER BY t.prefix ASC, t.localname ASC
