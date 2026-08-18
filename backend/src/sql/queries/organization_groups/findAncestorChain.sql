-- organization_group の祖先チェーンを取得（URI 構築用）
-- $1: organization_id
-- $2: parent_group_cd（起点となる親グループのCD）
--
-- 指定した parent_group_cd を含む全祖先を再帰的に取得し
-- ルート → 直近親 の順（depth 降順）で CD を返す。
-- parent_group_cd が NULL の場合（ルートグループ）は呼び出し元で空配列として処理する。
WITH RECURSIVE ancestors AS (
  -- 基底: parent_group_cd 自身
  SELECT
    organization_group_cd
    , parent_group_cd
    , 0 AS depth
  FROM organization_group
  WHERE organization_id = $1
    AND organization_group_cd = $2

  UNION ALL

  -- 再帰: 親をたどる
  SELECT
    g.organization_group_cd
    , g.parent_group_cd
    , a.depth + 1
  FROM organization_group g
  INNER JOIN ancestors a
    ON g.organization_group_cd = a.parent_group_cd
    AND g.organization_id = $1
)
SELECT organization_group_cd
FROM ancestors
ORDER BY depth DESC
