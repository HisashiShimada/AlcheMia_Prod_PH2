-- 組織新規作成
INSERT INTO organization (
  organization_id,
  organization_cd,
  organization_display_name,
  organization_email,
  chief_user_id,
  corporation_id,
  is_entry,
  use_deemed_progress,
  is_active,
  contract_capacity,
  contracted_users,
  contracted_projects,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
)
RETURNING
  organization_id,
  organization_cd,
  organization_display_name,
  organization_email,
  chief_user_id,
  corporation_id,
  is_active,
  contract_capacity,
  contracted_users,
  contracted_projects,
  update_at
