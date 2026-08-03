-- scope_key（ユーザーID）に紐づく名前空間一覧を取得
-- Personal ノード表示用。organization_user テーブルと JOIN して user_name を返す
SELECT
  n.namespace_id
  , n.uri
  , n.scope_key
  , COALESCE(n.global_flg, FALSE) AS global_flg
  , ou.user_name
FROM namespace n
LEFT JOIN organization_user ou
  ON n.organization_id = ou.organization_id
  AND n.scope_key = ou.user_id
WHERE n.organization_id = $1
  AND n.scope_key = $2
ORDER BY n.namespace_id ASC
