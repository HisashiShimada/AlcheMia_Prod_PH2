-- namespace_term を更新（UPDATE）
UPDATE namespace_term SET
  display_name  = $4
  , description = $5
  , xsi_type    = $6
  , units       = $7
  , has_directive_term = $8
  , update_at   = CURRENT_TIMESTAMP
WHERE organization_id = $1
  AND prefix = $2
  AND localname = $3
