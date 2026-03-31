-- ============================================================
-- maiml_event_element カラム追加 - 適用用SQL
--
-- @description
--   20260319_add_columns_to_event_element.sql をスキーマ
--   a0718dc5_21f3_44e6_87e9_cc2ae83f3385 に適用する。
--
--   実行方法:
--     psql -U <user> -d <dbname> -f 20260319_add_columns_to_event_element_apply.sql
--
-- ============================================================

-- element_type の DEFAULT 制約を除去（property 固定から汎用化）
ALTER TABLE "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event_element
  ALTER COLUMN element_type DROP DEFAULT;

-- 不足カラムを追加
ALTER TABLE "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event_element
  ADD COLUMN IF NOT EXISTS xsi_type        TEXT,
  ADD COLUMN IF NOT EXISTS format_string   TEXT,
  ADD COLUMN IF NOT EXISTS units           TEXT,
  ADD COLUMN IF NOT EXISTS scale_factor    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS axis            TEXT,
  ADD COLUMN IF NOT EXISTS size_value      INT,
  ADD COLUMN IF NOT EXISTS element_id_attr TEXT,
  ADD COLUMN IF NOT EXISTS element_ref     TEXT;

-- 確認
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'a0718dc5_21f3_44e6_87e9_cc2ae83f3385'
  AND table_name   = 'maiml_event_element'
ORDER BY ordinal_position;
