-- Vendorマスタ更新（corporation_idで照合）
UPDATE vendor
SET
  vendor_name = COALESCE($3, vendor_name),
  vendor_description = COALESCE($4, vendor_description),
  vendor_annotation = COALESCE($5, vendor_annotation),
  is_active = COALESCE($6, is_active),
  update_user_id = $7,
  update_at = NOW()
WHERE corporation_id = $1
  AND vendor_id = $2
RETURNING
  vendor_id,
  vendor_uuid,
  vendor_name,
  vendor_description,
  vendor_annotation,
  is_active,
  update_at
