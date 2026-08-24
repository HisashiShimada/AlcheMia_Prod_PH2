-- namespace テーブルの scope_key にユニーク制約を追加
-- 同一組織内で scope_key が重複しないことを保証する
--
-- ⚠️ 事前確認: 重複データが存在する場合は事前にクリーンアップが必要
--   以下のSQLで重複確認:
--   SELECT organization_id, scope_key, COUNT(*)
--   FROM namespace
--   WHERE scope_key IS NOT NULL
--   GROUP BY organization_id, scope_key
--   HAVING COUNT(*) > 1;
--
-- 重複している場合、新しい方（namespace_id が大きい方）を削除し、古い方を残す
DELETE FROM namespace n1
USING namespace n2
WHERE n1.organization_id = n2.organization_id
  AND n1.scope_key = n2.scope_key
  AND n1.scope_key IS NOT NULL
  AND n1.namespace_id > n2.namespace_id;

-- ユニーク制約を追加
-- ※ PostgreSQL では NULL 同士はユニーク制約違反にならないため、
--   scope_key が NULL のレコードは複数存在してもエラーにならない
ALTER TABLE namespace
  ADD CONSTRAINT namespace_organization_scope_key_key
  UNIQUE (organization_id, scope_key);
