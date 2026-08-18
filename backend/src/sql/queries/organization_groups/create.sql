-- organization_group 新規作成クエリ
-- $1: organization_id
-- $2: organization_group_cd
-- $3: organization_group_name
-- $4: chief_user_id
-- $5: parent_group_cd (nullable)
-- $6: layer (nullable)
-- $7: create_user_id (nullable)
INSERT INTO organization_group (
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
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $7, CURRENT_TIMESTAMP
)
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
