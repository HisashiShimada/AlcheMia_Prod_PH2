-- Vendor一覧取得クエリ
-- 組織IDでフィルタリングし、Vendor情報を取得
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
ORDER BY vendor_id ASC
