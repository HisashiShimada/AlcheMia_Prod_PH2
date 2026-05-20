-- instrument_uuidをorganization_idスコープで取得（instrument_id指定なし）
SELECT instrument_uuid
FROM instrument
WHERE organization_id = $1 AND instrument_name = $2
LIMIT 1
