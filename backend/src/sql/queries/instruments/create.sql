-- Instrument新規作成クエリ
INSERT INTO instrument (
  organization_id,
  instrument_uuid,
  instrument_id,
  instrument_name,
  instrument_description,
  instrument_annotation,
  corporation_id,
  is_active,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
)
RETURNING
  instrument_id,
  instrument_uuid,
  instrument_name,
  instrument_description,
  instrument_annotation,
  is_active,
  update_at
