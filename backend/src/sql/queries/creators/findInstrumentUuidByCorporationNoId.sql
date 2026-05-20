-- instrument_uuidをcorporation_idスコープで取得（instrument_id指定なし）
SELECT instrument_uuid
FROM instrument
WHERE corporation_id = $1 AND instrument_name = $2
LIMIT 1
