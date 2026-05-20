-- vendor_uuidをcorporation_idスコープで取得（vendor_id指定あり）
SELECT vendor_uuid
FROM vendor
WHERE corporation_id = $1 AND vendor_id = $2 AND vendor_name = $3
LIMIT 1
