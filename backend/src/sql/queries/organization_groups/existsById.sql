-- organization_group 存在確認クエリ
-- $1: organization_id
-- $2: organization_group_cd
SELECT EXISTS (
  SELECT 1
  FROM organization_group
  WHERE organization_id = $1
    AND organization_group_cd = $2
) AS exists
