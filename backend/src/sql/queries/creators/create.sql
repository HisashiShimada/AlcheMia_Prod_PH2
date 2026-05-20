-- Creatorマスタを新規作成するクエリ
-- $1: organization_id, $2: creator_uuid, $3: creator_id, $4: creator_name
-- $5: creator_description, $6: creator_annotation, $7: vendor_uuid
-- $8: instrument_uuid, $9: corporation_id, $10: is_active
-- $11: create_user_id, $12: update_user_id
INSERT INTO creator (
  organization_id,
  creator_uuid,
  creator_id,
  creator_name,
  creator_description,
  creator_annotation,
  vendor_uuid,
  instrument_uuid,
  corporation_id,
  is_active,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
)
RETURNING
  creator_id,
  creator_name,
  creator_description,
  creator_annotation,
  is_active,
  update_at
