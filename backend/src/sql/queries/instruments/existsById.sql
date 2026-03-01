-- Instrument存在確認クエリ
SELECT EXISTS (
  SELECT 1
  FROM instrument
  WHERE organization_id = $1
    AND instrument_id = $2
) AS exists
