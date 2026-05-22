-- maiml_event_log へINSERT
INSERT INTO maiml_event_log (
  organization_id,
  project_id,
  sequence_no,
  log,
  create_user_id,
  create_at,
  update_user_id,
  update_at
)
VALUES (
  $1,
  $2,
  $3,
  $4::jsonb,
  $5,
  CURRENT_TIMESTAMP,
  $5,
  CURRENT_TIMESTAMP
)
