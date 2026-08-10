-- organization_group アクティブ状態更新クエリ（論理削除・有効化 共用）
-- $1: is_active (boolean)
-- $2: update_user_id (nullable)
-- $3: organization_id (WHERE条件)
-- $4: organization_group_cd (WHERE条件)
UPDATE organization_group
SET
  is_active = $1
  , update_user_id = $2
  , update_at = CURRENT_TIMESTAMP
WHERE organization_id = $3
  AND organization_group_cd = $4
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
