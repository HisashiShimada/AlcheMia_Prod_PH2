-- namespace_term に1件 INSERT
INSERT INTO namespace_term (
  organization_id
  , namespace_id
  , prefix
  , localname
  , display_name
  , description
  , xsi_type
  , units
  , is_active
  , create_at
  , update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, TRUE
  , CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
