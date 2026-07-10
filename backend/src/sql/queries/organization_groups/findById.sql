-- organization_group 単件取得クエリ
-- $1: organization_id
-- $2: organization_group_cd
SELECT
  organization_id
  , organization_group_cd
  , organization_group_name
  , chief_user_id
  , parent_group_cd
  , layer
  , create_user_id
  , create_at
  , update_user_id
  , update_at
FROM organization_group
WHERE organization_id = $1
  AND organization_group_cd = $2
