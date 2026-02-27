-- Instrument1件取得クエリ
-- 組織IDとInstrument IDで1件取得
SELECT
  instrument_id,
  instrument_uuid,
  instrument_name,
  instrument_description,
  instrument_annotation,
  is_active,
  update_at
FROM instrument
WHERE organization_id = $1
  AND instrument_id = $2
