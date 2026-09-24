-- Organization更新クエリ
-- $1: organization_id
-- $2: organization_display_name (null=変更なし)
-- $3: organization_email (null=変更なし)
-- $4: chief_user_id (null=変更なし)
-- $5: corporation_id (null=変更なし)
-- $6: is_entry (null=変更なし)
-- $7: is_active (null=変更なし)
-- $8: update_user_id
-- $9: contract_capacity (null=変更なし)
-- $10: contract_users (null=変更なし)
-- $11: contract_projects (null=変更なし)
-- $12: default_retention_days (null=変更なし)
UPDATE organization
SET
  organization_display_name = COALESCE($2, organization_display_name),
  organization_email        = COALESCE($3, organization_email),
  chief_user_id             = COALESCE($4, chief_user_id),
  corporation_id            = COALESCE($5, corporation_id),
  is_entry                  = COALESCE($6, is_entry),
  is_active                 = COALESCE($7, is_active),
  contract_capacity         = COALESCE($9, contract_capacity),
  contract_users            = COALESCE($10, contract_users),
  contract_projects         = COALESCE($11, contract_projects),
  default_retention_days    = COALESCE($12, default_retention_days),
  update_user_id            = $8,
  update_at                 = NOW()
WHERE organization_id = $1
RETURNING
  organization_id
