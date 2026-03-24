-- ============================================================
-- {org_schema}.maiml_template_insertion（protocol 層 外部ファイル参照）
--
-- @schema   {org_schema}
-- @description
--   maiml_template の insertion（外部ファイル参照）を正規化して格納する。
--   maiml_insertion と同一のカラム構成（親テーブルのみ異なる）。
--
-- @reference
--   docs/MaiML_OpenData_Pipeline/db.md §4.9
-- ============================================================

CREATE TABLE IF NOT EXISTS {org_schema}.maiml_template_insertion (
  insertion_id  BIGSERIAL  PRIMARY KEY,
  template_id   BIGINT     NOT NULL
                REFERENCES {org_schema}.maiml_template(template_id) ON DELETE CASCADE,
  uri           TEXT       NOT NULL,    -- 外部ファイルのパス/URI
  hash_value    TEXT,                   -- ファイルハッシュ値
  hash_method   TEXT,                   -- ハッシュアルゴリズム（例: SHA-256）
  file_uuid     TEXT,                   -- ファイル UUID
  mime_format   TEXT,                   -- MIME タイプ（例: image/tiff）
  maiml_line_no INT                     -- MaiML ファイル内の行番号
);

CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_insertion_template
  ON {org_schema}.maiml_template_insertion(template_id);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_insertion_uri
  ON {org_schema}.maiml_template_insertion(uri);
