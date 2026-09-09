-- プロジェクトスコープで絞り込んだ namespace 宣言一覧を取得
-- - orgGroupCd が指定された場合は scope_key = orgGroupCd およびその祖先グループの namespace を返す
-- - orgGroupCd が NULL の場合は organization_id 配下の全件を返す
-- - 同一 prefix が対象グループと祖先グループの両方に存在する場合は depth=0（対象グループ）を優先
-- - DISTINCT ON により prefix 単位で1件に絞り込む（PostgreSQL 専用構文）
-- （グローバル名前空間はファイルサーバ管理に移行したため global_flg 条件・カラムを削除）
WITH RECURSIVE ancestors AS (
  -- 基底ケース: 指定したグループCD（depth=0 が対象グループ自身）
  SELECT
    organization_group_cd
    , parent_group_cd
    , organization_id
    , 0 AS depth
  FROM organization_group
  WHERE organization_id = $1
    AND organization_group_cd = $2

  UNION ALL

  -- 再帰ケース: 親を辿る
  SELECT
    og.organization_group_cd
    , og.parent_group_cd
    , og.organization_id
    , ancestors.depth + 1
  FROM organization_group og
  INNER JOIN ancestors
    ON og.organization_id = ancestors.organization_id
    AND og.organization_group_cd = ancestors.parent_group_cd
)
SELECT DISTINCT ON (p.prefix)
  p.prefix
  , n.uri
FROM prefix p
INNER JOIN namespace n
  ON p.organization_id = n.organization_id
  AND p.namespace_id = n.namespace_id
-- orgGroupCd が NULL の場合は全件取得、指定時は対象グループ+祖先グループに絞り込む
LEFT JOIN ancestors a
  ON n.scope_key = a.organization_group_cd
WHERE p.organization_id = $1
  AND p.is_active = TRUE
  AND (
        ($2::VARCHAR IS NULL)
        OR a.organization_group_cd IS NOT NULL
      )
-- depth ASC により対象グループ（depth=0）が最優先、DISTINCT ON の先頭行として採用される
ORDER BY p.prefix ASC, a.depth ASC NULLS LAST

