-- integrity_audit_log へ TSA要求記録を挿入する
-- $1: organization_id
-- $2: hash
-- $3: tsa_endpoint
-- $4: event_timestamp
-- $5: recorded_at
-- $6: created_by (nullable)
INSERT INTO integrity_audit_log (
  organization_id,
  record_type,
  hash,
  tsa_endpoint,
  event_timestamp,
  recorded_at,
  created_by
) VALUES (
  $1,
  'timestamp_request',
  $2,
  $3,
  $4,
  $5,
  $6
)
