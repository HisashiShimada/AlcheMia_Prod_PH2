-- organization_group 更新クエリ
-- $1: organization_group_name
-- $2: chief_user_id
-- $3: parent_group_cd (nullable)
-- $4: layer (nullable)
-- $5: update_user_id (nullable)
-- $6: organization_id (WHERE条件)
-- $7: organization_group_cd (WHERE条件)
UPDATE organization_group
SET
  organization_group_name = $1
  , chief_user_id = $2
  , parent_group_cd = $3
  , layer = $4
  , update_user_id = $5
  , update_at = CURRENT_TIMESTAMP
WHERE organization_id = $6
  AND organization_group_cd = $7
RETURNING
  organization_id
  , organization_group_cd
  , organization_group_name
  , chief_user_id
  , parent_group_cd
  , layer
  , is_active
  , create_user_id
  , create_at
  , update_user_id
  , update_at
