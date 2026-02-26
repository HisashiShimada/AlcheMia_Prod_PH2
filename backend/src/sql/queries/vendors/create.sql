-- Vendor新規作成クエリ
INSERT INTO vendor (
  organization_id,
  vendor_uuid,
  vendor_id,
  vendor_name,
  vendor_description,
  vendor_annotation,
  corporation_id,
  is_active,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
)
RETURNING
  vendor_id,
  vendor_uuid,
  vendor_name,
  vendor_description,
  vendor_annotation,
  is_active,
  update_at
