-- namespace テーブルの scope_key にユニーク制約を追加
-- 同一組織内で scope_key が重複しないことを保証する
--
-- ⚠️ 冪等設計:
--   - 重複データのクリーンアップは create_at（古い方を残す）で判定
--   - ALTER TABLE は IF NOT EXISTS により制約が既存でもエラーにならない
--
-- ※ PostgreSQL では NULL 同士はユニーク制約違反にならないため、
--   scope_key が NULL のレコードは複数存在してもエラーにならない

-- Step 1: 重複データをクリーンアップ（create_at が新しい方を削除し、古い方を残す）
DELETE FROM namespace n1
USING namespace n2
WHERE n1.organization_id = n2.organization_id
  AND n1.scope_key = n2.scope_key
  AND n1.scope_key IS NOT NULL
  AND n1.create_at > n2.create_at;

-- Step 2: ユニーク制約を追加（既に存在する場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'namespace_organization_scope_key_key'
  ) THEN
    ALTER TABLE namespace
      ADD CONSTRAINT namespace_organization_scope_key_key
      UNIQUE (organization_id, scope_key);
  END IF;
END$$;
