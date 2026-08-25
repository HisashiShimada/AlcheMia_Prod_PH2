-- prefix テーブルの is_active を切り替える
-- $1: organization_id
-- $2: prefix
-- $3: is_active（TRUE=有効 / FALSE=無効）
UPDATE prefix
SET
  is_active  = $3
  , update_at = CURRENT_TIMESTAMP
WHERE organization_id = $1
  AND prefix          = $2
