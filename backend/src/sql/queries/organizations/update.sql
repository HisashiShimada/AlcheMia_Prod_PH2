-- Organization更新クエリ
-- $1: organization_id
-- $2: organization_display_name (null=変更なし)
-- $3: organization_email (null=変更なし)
-- $4: chief_user_id (null=変更なし)
-- $5: corporation_id (null=変更なし)
-- $6: is_entry (null=変更なし)
-- $7: use_deemed_progress (null=変更なし)
-- $8: is_active (null=変更なし)
-- $9: update_user_id
-- $10: contract_capacity (null=変更なし)
-- $11: contracted_users (null=変更なし)
-- $12: contracted_projects (null=変更なし)
UPDATE organization
SET
  organization_display_name = COALESCE($2, organization_display_name),
  organization_email        = COALESCE($3, organization_email),
  chief_user_id             = COALESCE($4, chief_user_id),
  corporation_id            = COALESCE($5, corporation_id),
  is_entry                  = COALESCE($6, is_entry),
  use_deemed_progress       = COALESCE($7, use_deemed_progress),
  is_active                 = COALESCE($8, is_active),
  contract_capacity         = COALESCE($10, contract_capacity),
  contracted_users          = COALESCE($11, contracted_users),
  contracted_projects       = COALESCE($12, contracted_projects),
  update_user_id            = $9,
  update_at                 = NOW()
WHERE organization_id = $1
RETURNING
  organization_id
