-- Instrumentマスタ更新（corporation_idで照合）
UPDATE instrument
SET
  instrument_name = COALESCE($3, instrument_name),
  instrument_description = COALESCE($4, instrument_description),
  instrument_annotation = COALESCE($5, instrument_annotation),
  is_active = COALESCE($6, is_active),
  update_user_id = $7,
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
