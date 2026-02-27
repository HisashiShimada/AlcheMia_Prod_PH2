-- Vendor1件取得クエリ
-- 組織IDとVendor IDでフィルタリング
SELECT
  vendor_id,
  vendor_uuid,
  vendor_name,
  vendor_description,
  vendor_annotation,
  is_active,
  update_at
FROM vendor
WHERE organization_id = $1
  AND vendor_id = $2
