-- integrity_audit_log へ検証結果記録を挿入する
-- $1: organization_id
-- $2: success
-- $3: has_revocation (nullable)
-- $4: error_message (nullable)
-- $5: event_timestamp (nullable)
-- $6: recorded_at
-- $7: created_by (nullable)
INSERT INTO integrity_audit_log (
  organization_id,
  record_type,
  success,
  has_revocation,
  error_message,
  event_timestamp,
  recorded_at,
  created_by
) VALUES (
  $1,
  'verification_result',
  $2,
  $3,
  $4,
  $5,
  $6,
  $7
)
