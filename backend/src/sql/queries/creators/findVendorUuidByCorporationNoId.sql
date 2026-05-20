-- vendor_uuidをcorporation_idスコープで取得（vendor_id指定なし）
SELECT vendor_uuid
FROM vendor
WHERE corporation_id = $1 AND vendor_name = $2
LIMIT 1
