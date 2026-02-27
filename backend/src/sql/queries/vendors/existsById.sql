-- Vendor存在確認クエリ
SELECT EXISTS (
  SELECT 1
  FROM vendor
  WHERE organization_id = $1
    AND vendor_id = $2
) AS exists
