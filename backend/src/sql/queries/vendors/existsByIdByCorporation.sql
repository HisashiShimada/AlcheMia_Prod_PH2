-- Vendor存在確認クエリ（法人スコープ）
SELECT EXISTS (
  SELECT 1
  FROM vendor
  WHERE corporation_id = $1
    AND vendor_id = $2
) AS exists
