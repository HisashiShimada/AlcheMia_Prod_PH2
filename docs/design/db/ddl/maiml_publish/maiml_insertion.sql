-- ============================================================
-- {org_schema}.maiml_insertion（data 層 外部ファイル参照）
--
-- @schema   {org_schema}
-- @description
--   maiml_element の uri/hash/uuid/format 行を 1 レコードに集約した正規化テーブル。
--   外部ファイル参照の検索に使用。
--
-- @reference
--   docs/MaiML_OpenData_Pipeline/db.md §4.5
-- ============================================================

CREATE TABLE IF NOT EXISTS {org_schema}.maiml_insertion (
  insertion_id  BIGSERIAL  PRIMARY KEY,
  instance_id   BIGINT     NOT NULL
                REFERENCES {org_schema}.maiml_instance(instance_id) ON DELETE CASCADE,
  uri           TEXT       NOT NULL,    -- 外部ファイルのパス/URI
  hash_value    TEXT,                   -- ファイルハッシュ値
  hash_method   TEXT,                   -- ハッシュアルゴリズム（例: SHA-256）
  file_uuid     TEXT,                   -- ファイル UUID
  mime_format   TEXT,                   -- MIME タイプ（例: image/tiff）
  maiml_line_no INT                     -- MaiML ファイル内の行番号
);

CREATE INDEX IF NOT EXISTS ix_maiml_insertion_instance
  ON {org_schema}.maiml_insertion(instance_id);
CREATE INDEX IF NOT EXISTS ix_maiml_insertion_uri
  ON {org_schema}.maiml_insertion(uri);
