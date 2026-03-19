-- ============================================================
-- MaiML OpenData Pipeline: 組織スキーマへ event 関連テーブルを追加
--
-- @description
--   20260313_create_org_schema_tables.sql で作成した組織スキーマに
--   maiml_event / maiml_event_element / maiml_event_element_value
--   の3テーブルが含まれていなかったため、追加するマイグレーション。
--
--   実行対象スキーマ: a0718dc5_21f3_44e6_87e9_cc2ae83f3385
--   （organization_id = a0718dc5-21f3-44e6-87e9-cc2ae83f3385）
--
--   他の組織スキーマへ適用する場合は SCHEMA_NAME を書き換えること。
--
--   実行手順:
--     psql -U <user> -d <dbname> -f 20260318_add_event_tables_to_org_schema.sql
--
--   ロールバック方法:
--     DROP TABLE IF EXISTS "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event_element_value;
--     DROP TABLE IF EXISTS "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event_element;
--     DROP TABLE IF EXISTS "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event;
--
-- @reference
--   backend/src/sql/ddl/org_schema_tables.sql
--   docs/MaiML_OpenData_Pipeline/db.md §7.2
-- ============================================================

-- ============================================================
-- maiml_event（eventLog/log/trace は持たない、event 要素のみ格納）
-- @reference docs/MaiML_OpenData_Pipeline/db.md §7.2
-- ============================================================
CREATE TABLE IF NOT EXISTS "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event (
  event_id         BIGSERIAL    PRIMARY KEY,
  asset_id         BIGINT       NOT NULL
                   REFERENCES "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_asset(asset_id) ON DELETE CASCADE,
  event_key        TEXT,            -- event/@id 属性
  results_ref      TEXT,            -- event/resultsRef/@ref（data層の results_id と結合するキー）
  instruction_ref  TEXT,            -- event/@ref 属性（instruction の @id を参照）
  event_uuid       TEXT,            -- event/uuid テキスト
  event_name       TEXT,            -- event/name テキスト
  description      TEXT,
  annotation       TEXT,
  maiml_line_no    INT
);
CREATE INDEX IF NOT EXISTS ix_maiml_event_asset
  ON "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event(asset_id);
CREATE INDEX IF NOT EXISTS ix_maiml_event_results_ref
  ON "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event(asset_id, results_ref);
CREATE INDEX IF NOT EXISTS ix_maiml_event_instruction
  ON "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event(instruction_ref);

-- ============================================================
-- maiml_event_element（event 配下の property 行）
-- ============================================================
CREATE TABLE IF NOT EXISTS "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event_element (
  event_element_id   BIGSERIAL  PRIMARY KEY,
  event_id           BIGINT     NOT NULL
                     REFERENCES "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event(event_id) ON DELETE CASCADE,
  hierarchy          TEXT       NOT NULL,
  element_type       TEXT       NOT NULL DEFAULT 'property',
  key                TEXT,
  description        TEXT,
  maiml_line_no      INT
);
CREATE INDEX IF NOT EXISTS ix_maiml_event_element_event
  ON "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event_element(event_id);
CREATE INDEX IF NOT EXISTS ix_maiml_event_element_key
  ON "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event_element(key);

-- ============================================================
-- maiml_event_element_value（property の value 展開）
-- ============================================================
CREATE TABLE IF NOT EXISTS "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event_element_value (
  value_id          BIGSERIAL  PRIMARY KEY,
  event_element_id  BIGINT     NOT NULL
                    REFERENCES "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event_element(event_element_id) ON DELETE CASCADE,
  value_idx         INT        NOT NULL DEFAULT 0,
  value             TEXT,
  value_array       TEXT[]
);
CREATE INDEX IF NOT EXISTS ix_maiml_event_element_value_elem
  ON "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event_element_value(event_element_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_maiml_event_element_value
  ON "a0718dc5_21f3_44e6_87e9_cc2ae83f3385".maiml_event_element_value(event_element_id, value_idx);
