-- ============================================================
-- {org_schema}.maiml_template_element（protocol 層 汎用データ行）
--
-- @schema   {org_schema}
-- @description
--   maiml_template 配下の property / content 等をフラット化して格納する。
--   maiml_element と同一のカラム構成（parent_element_id による自己参照あり）。
--
-- @reference
--   docs/MaiML_OpenData_Pipeline/db.md §4.7
-- ============================================================

CREATE TABLE IF NOT EXISTS {org_schema}.maiml_template_element (
  element_id        BIGSERIAL  PRIMARY KEY,
  template_id       BIGINT     NOT NULL
                    REFERENCES {org_schema}.maiml_template(template_id) ON DELETE CASCADE,
  parent_element_id BIGINT
                    REFERENCES {org_schema}.maiml_template_element(element_id) ON DELETE CASCADE,
  hierarchy         TEXT       NOT NULL,        -- 連番階層パス（例: "1", "2-1", "2-1-3"）
  element_type      TEXT       NOT NULL,        -- 要素種別（maiml_element と同一）
  description       TEXT,                       -- /description テキスト
  element_data      TEXT,                       -- uri / hash 値 等（挿入系で使用）
  hash_method       TEXT,                       -- ハッシュアルゴリズム
  xsi_type          TEXT,                       -- @xsi:type 属性
  key               TEXT,                       -- @key 属性
  format_string     TEXT,                       -- @formatString 属性
  units             TEXT,                       -- @units 属性（単位）
  scale_factor      DOUBLE PRECISION,           -- @scaleFactor 属性
  axis              TEXT,                       -- @axis 属性（content のみ）
  size_value        INT,                        -- @size 属性（content のみ）
  element_id_attr   TEXT,                       -- @id 属性（content のみ）
  element_ref       TEXT,                       -- @ref 属性（content のみ）
  maiml_line_no     INT                         -- MaiML ファイル内の行番号
);

CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_element_template
  ON {org_schema}.maiml_template_element(template_id);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_element_parent
  ON {org_schema}.maiml_template_element(parent_element_id);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_element_type
  ON {org_schema}.maiml_template_element(element_type);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_element_key
  ON {org_schema}.maiml_template_element(key);
CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_element_hierarchy
  ON {org_schema}.maiml_template_element(template_id, hierarchy);
