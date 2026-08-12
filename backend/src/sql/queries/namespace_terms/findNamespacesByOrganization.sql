-- 組織に紐づく名前空間（prefix / uri）の一覧を取得
-- MaiMLファイルへの名前空間宣言書き込みに使用
-- UNION ALL で固定UUID (00000000-...) の Alchemia システム名前空間を常に含める
SELECT
  p.prefix
  , n.uri
FROM prefix p
INNER JOIN namespace n
  ON p.organization_id = n.organization_id
  AND p.namespace_id = n.namespace_id
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
