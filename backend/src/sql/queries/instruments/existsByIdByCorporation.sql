-- Instrument存在確認クエリ（法人スコープ）
SELECT EXISTS (
  SELECT 1
  FROM instrument
  WHERE corporation_id = $1
    AND instrument_id = $2
) AS exists
