-- Instrumentアクティブ状態更新クエリ（corporation_id指定）
UPDATE instrument
SET
  is_active = $3,
  update_user_id = $4,
  update_at = NOW()
WHERE corporation_id = $1
  AND instrument_id = $2
RETURNING
  instrument_id,
  instrument_uuid,
  instrument_name,
  instrument_description,
  instrument_annotation,
  is_active,
  update_at
