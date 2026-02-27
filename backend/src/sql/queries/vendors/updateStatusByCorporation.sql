-- Vendorアクティブ状態更新クエリ（corporation_id指定）
UPDATE vendor
SET
  is_active = $3,
  update_user_id = $4,
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
