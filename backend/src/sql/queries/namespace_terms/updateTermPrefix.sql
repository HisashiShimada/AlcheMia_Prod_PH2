-- namespace_term テーブルの prefix を一括 UPDATE する
-- FK制約のため、prefix テーブルの prefix 更新（updatePrefix.sql）より先に実行すること
-- $1: new_prefix（変更後の prefix 文字列）
-- $2: organization_id
-- $3: old_prefix（変更前の prefix 文字列）
UPDATE namespace_term
SET
  prefix     = $1
  , update_at = CURRENT_TIMESTAMP
WHERE organization_id = $2
  AND prefix          = $3
