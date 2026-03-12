-- MaiML OpenData Pipeline テーブル作成マイグレーション
-- 作成日: 2026-03-10
-- 設計書: docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md
-- スキーマ: maiml_publish（公開DB専用スキーマ）

BEGIN;

-- ============================================================
-- maiml_publish.maiml_asset（公開アセット）
-- TODO: v1.3以前の設計書確認後、既存スキーマと統合する
--       現在は asset_id / file_uri / doc_name / template_only のみ最低限定義
-- ============================================================
CREATE TABLE IF NOT EXISTS maiml_publish.maiml_asset (
  asset_id       BIGSERIAL    PRIMARY KEY,
  organization_id TEXT        NOT NULL,
  file_uri        TEXT        NOT NULL,
  doc_name        TEXT,
  template_only   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_maiml_asset_org    ON maiml_publish.maiml_asset(organization_id);
CREATE INDEX IF NOT EXISTS ix_maiml_asset_uri    ON maiml_publish.maiml_asset(file_uri);

-- ============================================================
-- maiml_publish.maiml_publish_registry（公開レジストリ）
-- TODO: v1.3以前の設計書確認後、既存カラム（PRIMARY KEY / status 等）を確定させる
--       現在は v1.3 で追加された ALTER TABLE カラム群と最低限のカラムのみ定義
-- ============================================================
CREATE TABLE IF NOT EXISTS maiml_publish.maiml_publish_registry (
  registry_id            BIGSERIAL    PRIMARY KEY,
  asset_id               BIGINT       NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  file_uri               TEXT         NOT NULL,
  -- TODO: status の enum 値・遷移ルールを確定させる
  status                 TEXT         NOT NULL DEFAULT 'requested'
                           CHECK (status IN ('requested','processing','published','unpublished')),
  template_only          BOOLEAN      NOT NULL DEFAULT FALSE,
  store_raw_series       BOOLEAN      NOT NULL DEFAULT FALSE,
  store_raw_raster       BOOLEAN      NOT NULL DEFAULT FALSE,
  raw_chunk_size         INT          NOT NULL DEFAULT 65536,
  raw_compression        TEXT         NOT NULL DEFAULT 'zstd',
  keep_raw_on_unpublish  BOOLEAN      NOT NULL DEFAULT FALSE,
  retention_until        TIMESTAMPTZ,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_registry_asset     ON maiml_publish.maiml_publish_registry(asset_id);
CREATE INDEX IF NOT EXISTS ix_registry_status    ON maiml_publish.maiml_publish_registry(status);

-- ============================================================
-- maiml_publish.maiml_condition_kv（実験条件 KV）
-- DDL 確定済み（BasicDesign v1.3 § 4.1）
-- ============================================================
CREATE TABLE IF NOT EXISTS maiml_publish.maiml_condition_kv (
  asset_id        BIGINT  NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  template_id     TEXT,
  -- NULL の場合は空文字列を格納（PRIMARY KEY に含めるため NOT NULL DEFAULT ''）
  instruction_id  TEXT    NOT NULL DEFAULT '',
  source_section  TEXT    NOT NULL,
  path            TEXT    NOT NULL,
  key             TEXT    NOT NULL,
  idx             INT     NOT NULL DEFAULT 0,
  value_text      TEXT,
  value_num       DOUBLE PRECISION,
  unit            TEXT,
  value_type      TEXT,
  format_string   TEXT,
  scale_factor    DOUBLE PRECISION,
  PRIMARY KEY (asset_id, source_section, path, key, idx, instruction_id)
);

CREATE INDEX IF NOT EXISTS ix_condition_kv_key         ON maiml_publish.maiml_condition_kv(key);
CREATE INDEX IF NOT EXISTS ix_condition_kv_path        ON maiml_publish.maiml_condition_kv(path);
CREATE INDEX IF NOT EXISTS ix_condition_kv_instruction ON maiml_publish.maiml_condition_kv(instruction_id);

-- ============================================================
-- maiml_publish.maiml_material_kv（材料情報 KV）
-- DDL 確定済み（BasicDesign v1.3 § 4.2）
-- ============================================================
CREATE TABLE IF NOT EXISTS maiml_publish.maiml_material_kv (
  asset_id        BIGINT  NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  template_id     TEXT,
  -- NULL の場合は空文字列を格納（PRIMARY KEY に含めるため NOT NULL DEFAULT ''）
  instruction_id  TEXT    NOT NULL DEFAULT '',
  source_section  TEXT    NOT NULL,
  path            TEXT    NOT NULL,
  key             TEXT    NOT NULL,
  idx             INT     NOT NULL DEFAULT 0,
  value_text      TEXT,
  value_num       DOUBLE PRECISION,
  unit            TEXT,
  value_type      TEXT,
  format_string   TEXT,
  scale_factor    DOUBLE PRECISION,
  PRIMARY KEY (asset_id, source_section, path, key, idx, instruction_id)
);

CREATE INDEX IF NOT EXISTS ix_material_kv_key          ON maiml_publish.maiml_material_kv(key);
CREATE INDEX IF NOT EXISTS ix_material_kv_path         ON maiml_publish.maiml_material_kv(path);
CREATE INDEX IF NOT EXISTS ix_material_kv_instruction  ON maiml_publish.maiml_material_kv(instruction_id);

-- ============================================================
-- maiml_publish.maiml_series_preview（プレビュー）
-- DDL 確定済み（BasicDesign v1.3 § 5.4）
-- ============================================================
CREATE TABLE IF NOT EXISTS maiml_publish.maiml_series_preview (
  preview_id        BIGSERIAL PRIMARY KEY,
  asset_id          BIGINT    NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  instruction_id    TEXT,
  template_id       TEXT,
  result_id         TEXT,
  result_name       TEXT,
  content_id        TEXT,
  content_size      INT,
  series_type       TEXT      NOT NULL CHECK (series_type IN ('TIC','SPECTRUM_TOTAL','OTHER')),
  x_label           TEXT      NOT NULL,
  y_label           TEXT      NOT NULL,
  mode              TEXT      NOT NULL CHECK (mode IN ('uniform','maxhold','mmr')),
  params            JSONB     NOT NULL DEFAULT '{}'::jsonb,
  original_points   INT       NOT NULL,
  preview_points    INT       NOT NULL,
  x                 DOUBLE PRECISION[] NOT NULL,
  y                 DOUBLE PRECISION[] NOT NULL,
  x_min             DOUBLE PRECISION,
  x_max             DOUBLE PRECISION,
  y_min             DOUBLE PRECISION,
  y_max             DOUBLE PRECISION,
  quality           JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_preview_asset_type      ON maiml_publish.maiml_series_preview(asset_id, series_type);
CREATE INDEX IF NOT EXISTS ix_preview_instruction     ON maiml_publish.maiml_series_preview(instruction_id);
CREATE INDEX IF NOT EXISTS ix_preview_template        ON maiml_publish.maiml_series_preview(template_id);
CREATE INDEX IF NOT EXISTS ix_preview_result_content  ON maiml_publish.maiml_series_preview(result_id, content_id);

-- ============================================================
-- maiml_publish.maiml_series_raw_header（生データヘッダ）
-- DDL 確定済み（BasicDesign v1.3 § 6.1）
-- ============================================================
CREATE TABLE IF NOT EXISTS maiml_publish.maiml_series_raw_header (
  raw_id          BIGSERIAL PRIMARY KEY,
  asset_id        BIGINT    NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  instruction_id  TEXT,
  template_id     TEXT,
  result_id       TEXT,
  result_name     TEXT,
  content_id      TEXT      NOT NULL,
  content_size    INT,
  x_label         TEXT,
  y_label         TEXT,
  x_unit          TEXT,
  y_unit          TEXT,
  points_total    BIGINT    NOT NULL,
  chunk_count     INT       NOT NULL,
  storage_format  TEXT      NOT NULL CHECK (storage_format IN ('array','binary')),
  compression     TEXT      NOT NULL DEFAULT 'none',
  checksum_sha256 TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_raw_header_asset        ON maiml_publish.maiml_series_raw_header(asset_id);
CREATE INDEX IF NOT EXISTS ix_raw_header_content      ON maiml_publish.maiml_series_raw_header(asset_id, content_id);

-- ============================================================
-- maiml_publish.maiml_series_raw_chunk（生データチャンク: Array方式）
-- DDL 確定済み（BasicDesign v1.3 § 6.2）
-- ============================================================
CREATE TABLE IF NOT EXISTS maiml_publish.maiml_series_raw_chunk (
  raw_id        BIGINT  NOT NULL REFERENCES maiml_publish.maiml_series_raw_header(raw_id) ON DELETE CASCADE,
  chunk_index   INT     NOT NULL,
  point_offset  BIGINT  NOT NULL,
  point_count   INT     NOT NULL,
  x_chunk       DOUBLE PRECISION[] NOT NULL,
  y_chunk       DOUBLE PRECISION[] NOT NULL,
  PRIMARY KEY (raw_id, chunk_index)
);

-- ============================================================
-- maiml_publish.maiml_series_raw_chunk_bin（生データチャンク: Binary方式）
-- DDL 確定済み（BasicDesign v1.3 § 6.3）
-- ============================================================
CREATE TABLE IF NOT EXISTS maiml_publish.maiml_series_raw_chunk_bin (
  raw_id        BIGINT  NOT NULL REFERENCES maiml_publish.maiml_series_raw_header(raw_id) ON DELETE CASCADE,
  chunk_index   INT     NOT NULL,
  point_offset  BIGINT  NOT NULL,
  point_count   INT     NOT NULL,
  codec         TEXT    NOT NULL,
  payload       BYTEA   NOT NULL,
  PRIMARY KEY (raw_id, chunk_index)
);

COMMIT;
