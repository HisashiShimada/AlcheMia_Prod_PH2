-- ============================================================
-- MaiML OpenData Pipeline: 組織スキーマ内テーブル DDL（手動実行用）
--
-- @description
--   組織ごとの PostgreSQL スキーマ内に作成するテーブル群。
--
--   通常は組織初回公開時にアプリケーションが自動でスキーマ・テーブルを作成する。
--   このスクリプトは障害復旧・手動セットアップ時に psql で直接実行するためのもの。
--
--   実行前に SCHEMA_NAME を対象組織の UUID（ハイフンをアンダースコアに置換）に変更すること。
--   例: 550e8400-e29b-41d4-a716-446655440000
--     → SET search_path TO "550e8400_e29b_41d4_a716_446655440000";
--
--   実行手順:
--     1. 下記の SET 文のスキーマ名を書き換える
--     2. psql -U <user> -d <dbname> -f 20260313_create_org_schema_tables.sql
--
-- @reference docs/MaiML_OpenData_Pipeline/db.md §4
-- ============================================================

-- !! 実行前にスキーマ名を変更すること !!
-- \set SCHEMA_NAME '550e8400_e29b_41d4_a716_446655440000'
-- SET search_path TO :"SCHEMA_NAME";
-- CREATE SCHEMA IF NOT EXISTS :"SCHEMA_NAME";

-- 以下は DDL テンプレート（{{SCHEMA_NAME}} を対象スキーマ名に置換して使用）
-- ============================================================

-- ============================================================
-- maiml_asset
-- ============================================================
CREATE TABLE IF NOT EXISTS "{{SCHEMA_NAME}}".maiml_asset (
  asset_id         BIGSERIAL    PRIMARY KEY,
  file_uri         TEXT         NOT NULL,
  doc_name         TEXT,
  retention_until  TIMESTAMPTZ  NOT NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_maiml_asset_uri
  ON "{{SCHEMA_NAME}}".maiml_asset(file_uri);
CREATE INDEX IF NOT EXISTS ix_maiml_asset_retention_until
  ON "{{SCHEMA_NAME}}".maiml_asset(retention_until);

-- ============================================================
-- maiml_instance
-- ============================================================
CREATE TABLE IF NOT EXISTS "{{SCHEMA_NAME}}".maiml_instance (
  instance_id      BIGSERIAL  PRIMARY KEY,
  asset_id         BIGINT     NOT NULL
                   REFERENCES "{{SCHEMA_NAME}}".maiml_asset(asset_id) ON DELETE CASCADE,
  instance_type    TEXT       NOT NULL
                   CHECK (instance_type IN ('result', 'material', 'condition')),
  instance_key     TEXT       NOT NULL,
  template_ref     TEXT,
  instance_uuid    TEXT,
  instance_name    TEXT,
  instance_line_no INT
);
CREATE INDEX IF NOT EXISTS ix_maiml_instance_asset
  ON "{{SCHEMA_NAME}}".maiml_instance(asset_id);
CREATE INDEX IF NOT EXISTS ix_maiml_instance_type
  ON "{{SCHEMA_NAME}}".maiml_instance(instance_type);
CREATE INDEX IF NOT EXISTS ix_maiml_instance_key
  ON "{{SCHEMA_NAME}}".maiml_instance(instance_key);
CREATE INDEX IF NOT EXISTS ix_maiml_instance_template
  ON "{{SCHEMA_NAME}}".maiml_instance(template_ref);

-- ============================================================
-- maiml_element
-- ============================================================
CREATE TABLE IF NOT EXISTS "{{SCHEMA_NAME}}".maiml_element (
  element_id        BIGSERIAL  PRIMARY KEY,
  instance_id       BIGINT     NOT NULL
                    REFERENCES "{{SCHEMA_NAME}}".maiml_instance(instance_id) ON DELETE CASCADE,
  parent_element_id BIGINT
                    REFERENCES "{{SCHEMA_NAME}}".maiml_element(element_id) ON DELETE CASCADE,
  hierarchy         TEXT       NOT NULL,
  element_type      TEXT       NOT NULL,
  description       TEXT,
  element_data      TEXT,
  hash_method       TEXT,
  xsi_type          TEXT,
  key               TEXT,
  format_string     TEXT,
  units             TEXT,
  scale_factor      DOUBLE PRECISION,
  axis              TEXT,
  size_value        INT,
  element_id_attr   TEXT,
  element_ref       TEXT,
  maiml_line_no     INT
);
CREATE INDEX IF NOT EXISTS ix_maiml_element_instance
  ON "{{SCHEMA_NAME}}".maiml_element(instance_id);
CREATE INDEX IF NOT EXISTS ix_maiml_element_parent
  ON "{{SCHEMA_NAME}}".maiml_element(parent_element_id);
CREATE INDEX IF NOT EXISTS ix_maiml_element_type
  ON "{{SCHEMA_NAME}}".maiml_element(element_type);
CREATE INDEX IF NOT EXISTS ix_maiml_element_key
  ON "{{SCHEMA_NAME}}".maiml_element(key);
CREATE INDEX IF NOT EXISTS ix_maiml_element_hierarchy
  ON "{{SCHEMA_NAME}}".maiml_element(instance_id, hierarchy);

-- ============================================================
-- maiml_element_value
-- ============================================================
CREATE TABLE IF NOT EXISTS "{{SCHEMA_NAME}}".maiml_element_value (
  value_id     BIGSERIAL  PRIMARY KEY,
  element_id   BIGINT     NOT NULL
               REFERENCES "{{SCHEMA_NAME}}".maiml_element(element_id) ON DELETE CASCADE,
  value_idx    INT        NOT NULL DEFAULT 0,
  value        TEXT,
  value_array  TEXT[]
);
CREATE INDEX IF NOT EXISTS ix_maiml_element_value_element
  ON "{{SCHEMA_NAME}}".maiml_element_value(element_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_maiml_element_value
  ON "{{SCHEMA_NAME}}".maiml_element_value(element_id, value_idx);

-- ============================================================
-- maiml_insertion
-- ============================================================
CREATE TABLE IF NOT EXISTS "{{SCHEMA_NAME}}".maiml_insertion (
  insertion_id  BIGSERIAL  PRIMARY KEY,
  instance_id   BIGINT     NOT NULL
                REFERENCES "{{SCHEMA_NAME}}".maiml_instance(instance_id) ON DELETE CASCADE,
  uri           TEXT       NOT NULL,
  hash_value    TEXT,
  hash_method   TEXT,
  file_uuid     TEXT,
  mime_format   TEXT,
  maiml_line_no INT
);
CREATE INDEX IF NOT EXISTS ix_maiml_insertion_instance
  ON "{{SCHEMA_NAME}}".maiml_insertion(instance_id);
CREATE INDEX IF NOT EXISTS ix_maiml_insertion_uri
  ON "{{SCHEMA_NAME}}".maiml_insertion(uri);

-- ============================================================
-- maiml_template
-- ============================================================
CREATE TABLE IF NOT EXISTS "{{SCHEMA_NAME}}".maiml_template (
  template_id      BIGSERIAL  PRIMARY KEY,
  asset_id         BIGINT     NOT NULL
                   REFERENCES "{{SCHEMA_NAME}}".maiml_asset(asset_id) ON DELETE CASCADE,
  template_type    TEXT       NOT NULL
                   CHECK (template_type IN ('result', 'material', 'condition')),
  template_key     TEXT       NOT NULL,
  template_uuid    TEXT,
  template_name    TEXT,
  template_line_no INT
);
CREATE INDEX IF NOT EXISTS ix_maiml_template_asset
  ON "{{SCHEMA_NAME}}".maiml_template(asset_id);
CREATE INDEX IF NOT EXISTS ix_maiml_template_type
  ON "{{SCHEMA_NAME}}".maiml_template(template_type);
CREATE INDEX IF NOT EXISTS ix_maiml_template_key
  ON "{{SCHEMA_NAME}}".maiml_template(template_key);

-- ============================================================
-- maiml_template_element
-- ============================================================
CREATE TABLE IF NOT EXISTS "{{SCHEMA_NAME}}".maiml_template_element (
  element_id        BIGSERIAL  PRIMARY KEY,
  template_id       BIGINT     NOT NULL
                    REFERENCES "{{SCHEMA_NAME}}".maiml_template(template_id) ON DELETE CASCADE,
  parent_element_id BIGINT
                    REFERENCES "{{SCHEMA_NAME}}".maiml_template_element(element_id) ON DELETE CASCADE,
  hierarchy         TEXT       NOT NULL,
  element_type      TEXT       NOT NULL,
  description       TEXT,
  element_data      TEXT,
  hash_method       TEXT,
  xsi_type          TEXT,
  key               TEXT,
  format_string     TEXT,
  units             TEXT,
  scale_factor      DOUBLE PRECISION,
  axis              TEXT,
  size_value        INT,
  element_id_attr   TEXT,
  element_ref       TEXT,
  maiml_line_no     INT
);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_element_template
  ON "{{SCHEMA_NAME}}".maiml_template_element(template_id);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_element_parent
  ON "{{SCHEMA_NAME}}".maiml_template_element(parent_element_id);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_element_type
  ON "{{SCHEMA_NAME}}".maiml_template_element(element_type);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_element_key
  ON "{{SCHEMA_NAME}}".maiml_template_element(key);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_element_hierarchy
  ON "{{SCHEMA_NAME}}".maiml_template_element(template_id, hierarchy);

-- ============================================================
-- maiml_template_element_value
-- ============================================================
CREATE TABLE IF NOT EXISTS "{{SCHEMA_NAME}}".maiml_template_element_value (
  value_id     BIGSERIAL  PRIMARY KEY,
  element_id   BIGINT     NOT NULL
               REFERENCES "{{SCHEMA_NAME}}".maiml_template_element(element_id) ON DELETE CASCADE,
  value_idx    INT        NOT NULL DEFAULT 0,
  value        TEXT,
  value_array  TEXT[]
);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_element_value_element
  ON "{{SCHEMA_NAME}}".maiml_template_element_value(element_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_maiml_tmpl_element_value
  ON "{{SCHEMA_NAME}}".maiml_template_element_value(element_id, value_idx);

-- ============================================================
-- maiml_template_insertion
-- ============================================================
CREATE TABLE IF NOT EXISTS "{{SCHEMA_NAME}}".maiml_template_insertion (
  insertion_id  BIGSERIAL  PRIMARY KEY,
  template_id   BIGINT     NOT NULL
                REFERENCES "{{SCHEMA_NAME}}".maiml_template(template_id) ON DELETE CASCADE,
  uri           TEXT       NOT NULL,
  hash_value    TEXT,
  hash_method   TEXT,
  file_uuid     TEXT,
  mime_format   TEXT,
  maiml_line_no INT
);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_insertion_template
  ON "{{SCHEMA_NAME}}".maiml_template_insertion(template_id);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_insertion_uri
  ON "{{SCHEMA_NAME}}".maiml_template_insertion(uri);
