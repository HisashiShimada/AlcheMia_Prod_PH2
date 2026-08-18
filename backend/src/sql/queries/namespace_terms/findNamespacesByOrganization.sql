-- 組織に紐づく名前空間（prefix / uri）の一覧を取得
-- MaiMLファイルへの名前空間宣言書き込みに使用（組織固有のみ・グローバルはファイルサーバで管理）
SELECT
  p.prefix
  , n.uri
  , n.scope_key                                                     AS "scopeKey"
  , COALESCE(og.organization_group_name, ou.user_name, '')          AS "scopeName"
FROM prefix p
INNER JOIN namespace n
  ON p.organization_id = n.organization_id
  AND p.namespace_id = n.namespace_id
LEFT JOIN organization_group og
  ON og.organization_id = p.organization_id
  AND og.organization_group_cd = n.scope_key
LEFT JOIN organization_user ou
  ON ou.organization_id = p.organization_id
  AND ou.user_id = n.scope_key
WHERE p.organization_id = $1
  AND p.is_active = TRUE
UNION ALL
SELECT
  p.prefix
  , n.uri
FROM prefix p
INNER JOIN namespace n
  ON p.organization_id = n.organization_id
  AND p.namespace_id = n.namespace_id
WHERE p.organization_id = '00000000-0000-0000-0000-000000000000'
  AND p.is_active = TRUE
ORDER BY prefix ASC
