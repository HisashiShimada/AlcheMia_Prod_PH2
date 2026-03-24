-- ============================================================
-- maiml_event_element カラム追加
--
-- @description
--   maiml_event_element テーブルのカラム構成を maiml_element と揃える。
--   XSD確認の結果、event 配下には property だけでなく content も配置でき、
--   property も xsi:type によって @units / @scaleFactor 等を持てることが判明。
--   最小構成だった既存テーブルに不足カラムを追加する。
--
--   追加カラム:
--     xsi_type        TEXT            -- @xsi:type 属性（intType, stringType 等）
--     format_string   TEXT            -- @formatString 属性
--     units           TEXT            -- @units 属性（単位）
--     scale_factor    DOUBLE PRECISION -- @scaleFactor 属性
--     axis            TEXT            -- @axis 属性（content のみ使用）
--     size_value      INT             -- @size 属性（content のみ使用）
--     element_id_attr TEXT            -- @id 属性
--     element_ref     TEXT            -- @ref 属性
--
--   また element_type の DEFAULT 'property' 制約を除去し、
--   content も格納可能にする。
--
--   実行対象: 全組織スキーマ
--   実行方法:
--     全組織スキーマに適用する場合は SCHEMA_NAME を書き換えて繰り返す。
--     例: psql -U <user> -d <dbname> \
--           -v schema=a0718dc5_21f3_44e6_87e9_cc2ae83f3385 \
--           -f 20260319_add_columns_to_event_element.sql
--
--   ロールバック方法:
--     ALTER TABLE "<schema>".maiml_event_element
--       DROP COLUMN IF EXISTS xsi_type,
--       DROP COLUMN IF EXISTS format_string,
--       DROP COLUMN IF EXISTS units,
--       DROP COLUMN IF EXISTS scale_factor,
--       DROP COLUMN IF EXISTS axis,
--       DROP COLUMN IF EXISTS size_value,
--       DROP COLUMN IF EXISTS element_id_attr,
--       DROP COLUMN IF EXISTS element_ref;
--     ALTER TABLE "<schema>".maiml_event_element
--       ALTER COLUMN element_type SET DEFAULT 'property';
--
-- @reference
--   backend/src/sql/ddl/org_schema_tables.sql
--   docs/MaiML_OpenData_Pipeline/db.md §7.2
-- ============================================================

-- ============================================================
-- 適用スキーマを変数で指定（psql -v schema=xxx で上書き可能）
-- デフォルト: a0718dc5_21f3_44e6_87e9_cc2ae83f3385
-- ============================================================
\set SCHEMA_NAME :schema

-- element_type の DEFAULT 制約を除去（property 固定から汎用化）
ALTER TABLE :"SCHEMA_NAME".maiml_event_element
  ALTER COLUMN element_type DROP DEFAULT;

-- 不足カラムを追加
ALTER TABLE :"SCHEMA_NAME".maiml_event_element
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
WHERE table_schema = :'SCHEMA_NAME'
  AND table_name   = 'maiml_event_element'
ORDER BY ordinal_position;
