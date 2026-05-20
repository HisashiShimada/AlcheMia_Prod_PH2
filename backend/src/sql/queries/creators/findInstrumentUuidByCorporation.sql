-- instrument_uuidをcorporation_idスコープで取得（instrument_id指定あり）
SELECT instrument_uuid
FROM instrument
WHERE corporation_id = $1 AND instrument_id = $2 AND instrument_name = $3
LIMIT 1
