-- namespace_term をスコープ内で検索（重複チェック専用）
-- (organization_id, namespace_id, prefix, localname) の4列で1件取得
-- create() / createInTx() の重複チェックに使用
-- ※ findTermByKey.sql はスコープを無視した全組織検索のため、スコープを限定する本SQLを使用する
-- $1: organization_id
-- $2: namespace_id（登録先スコープの namespace_id）
-- $3: prefix
-- $4: localname
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
FROM namespace_term t
WHERE t.organization_id = $1
  AND t.namespace_id    = $2
  AND t.prefix          = $3
  AND t.localname       = $4
