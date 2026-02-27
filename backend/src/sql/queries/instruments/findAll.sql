-- Instrument一覧取得クエリ
-- 指定された組織のInstrumentマスタを全件取得
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
ORDER BY instrument_id ASC
