-- バリデーション履歴を作成するクエリ
-- $1: validation_id, $2: organization_id, $3: project_id, $4: file_key
-- $5: user_id, $6: validation_mode, $7: is_valid, $8: total_errors, $9: total_warnings
-- $10: error_details, $11: warning_details, $12: validation_duration_ms
-- $13: elements_validated, $14: attributes_validated, $15: nodes_validated, $16: arcs_validated
INSERT INTO maiml_validation_history (
  validation_id,
  organization_id,
  project_id,
  file_key,
  user_id,
  validation_mode,
  is_valid,
  total_errors,
  total_warnings,
  error_details,
  warning_details,
  validation_duration_ms,
  elements_validated,
  attributes_validated,
  nodes_validated,
  arcs_validated,
  created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
RETURNING *
