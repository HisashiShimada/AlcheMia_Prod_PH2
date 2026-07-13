-- organization_group 子孫CD一覧取得（再帰）
-- 指定されたルートグループCD群から始まり、それ自身と全配下グループのCDを返す
-- 使用箇所:
--   - organizationGroupRepository.ts - findDescendantCds()
-- パラメータ: $1=organizationId, $2=rootCds(text[])

WITH RECURSIVE descendants AS (
  -- ベースケース: ルートグループ（rootCds に含まれるもの）
  SELECT
    organization_group_cd
  FROM organization_group
  WHERE organization_id = $1
    AND organization_group_cd = ANY($2::text[])

  UNION ALL

  -- 再帰ケース: 各グループの子グループを取得
  SELECT
    og.organization_group_cd
  FROM organization_group og
  INNER JOIN descendants d
    ON og.parent_group_cd = d.organization_group_cd
    AND og.organization_id = $1
)
SELECT DISTINCT organization_group_cd
FROM descendants
