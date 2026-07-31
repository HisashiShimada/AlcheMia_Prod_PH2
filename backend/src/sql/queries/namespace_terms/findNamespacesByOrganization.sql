-- 組織に紐づく名前空間（prefix / uri）の一覧を取得
-- MaiMLファイルへの名前空間宣言書き込みに使用
SELECT
  p.prefix
  , n.uri
FROM prefix p
INNER JOIN namespace n
  ON p.organization_id = n.organization_id
  AND p.namespace_id = n.namespace_id
WHERE p.organization_id = $1
  AND p.is_active = TRUE
ORDER BY p.prefix ASC
