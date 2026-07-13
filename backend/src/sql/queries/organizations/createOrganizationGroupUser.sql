-- 組織グループユーザー割当
-- $1: organization_id, $2: organization_group_cd, $3: user_id
INSERT INTO organization_group_user (
  organization_id,
  organization_group_cd,
  user_id,
  create_at
) VALUES (
  $1, $2, $3, NOW()
)
ON CONFLICT (organization_id, organization_group_cd, user_id) DO NOTHING
