-- scope_key（ユーザーID または organization_group_cd）に紐づく名前空間一覧を取得
-- INNER JOIN により prefix が登録済みの行のみ返す（prefix=NULL の空白行を防ぐ）
-- （グローバル名前空間はファイルサーバ管理に移行したため isGlobal カラムを削除）
SELECT
  p.prefix
  , n.uri
  , p.description                                                   AS description
  , n.scope_key                                                     AS "scopeKey"
  , COALESCE(og.organization_group_name, ou.user_name, '')          AS "scopeName"
  , p.is_active                                                     AS "isActive"
FROM namespace n
INNER JOIN prefix p
  ON p.organization_id = n.organization_id
  AND p.namespace_id = n.namespace_id
LEFT JOIN organization_group og
  ON og.organization_id = n.organization_id
  AND og.organization_group_cd = n.scope_key
LEFT JOIN organization_user ou
  ON ou.organization_id = n.organization_id
  AND ou.user_id = n.scope_key
WHERE n.organization_id = $1
  AND n.scope_key = $2
ORDER BY p.prefix ASC
