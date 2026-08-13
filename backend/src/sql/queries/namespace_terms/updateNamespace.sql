-- namespace テーブルの URI を更新する
-- $1: uri
-- $2: organization_id
-- $3: prefix
UPDATE namespace
SET
  uri        = $1
  , update_at = CURRENT_TIMESTAMP
WHERE organization_id = $2
  AND namespace_id = (
    SELECT namespace_id FROM prefix
    WHERE organization_id = $2
      AND prefix = $3
    LIMIT 1
  )
RETURNING
  namespace_id
  , (
    SELECT p.prefix FROM prefix p
    WHERE p.namespace_id = namespace.namespace_id
      AND p.organization_id = $2
    LIMIT 1
  ) AS prefix
  , uri
  , scope_key
