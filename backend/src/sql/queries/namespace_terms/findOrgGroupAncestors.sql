-- 組織階層グループの先祖パスを取得（URI生成用）
-- 指定グループCDから上位階層を再帰的に取得し、ルートから指定グループまでのCDを順番に返す
WITH RECURSIVE ancestors AS (
  -- 基底ケース: 指定したグループCD
  SELECT
    organization_group_cd,
    parent_group_cd,
    organization_id,
    0 AS depth
  FROM organization_group
  WHERE organization_id = $1
    AND organization_group_cd = $2

  UNION ALL

  -- 再帰ケース: 親を辿る
  SELECT
    og.organization_group_cd,
    og.parent_group_cd,
    og.organization_id,
    ancestors.depth + 1
  FROM organization_group og
  INNER JOIN ancestors
    ON og.organization_id = ancestors.organization_id
    AND og.organization_group_cd = ancestors.parent_group_cd
)
SELECT organization_group_cd, depth
FROM ancestors
ORDER BY depth DESC
