-- ============================================================
-- {org_schema}.maiml_template_element_value（protocol 層 value 展開）
--
-- @schema   {org_schema}
-- @description
--   maiml_template_element の <value> 子要素を展開して格納する。
--   登録方針は maiml_element_value と同一。
--
-- @reference
--   docs/MaiML_OpenData_Pipeline/db.md §4.8
-- ============================================================

CREATE TABLE IF NOT EXISTS {org_schema}.maiml_template_element_value (
  value_id     BIGSERIAL  PRIMARY KEY,
  element_id   BIGINT     NOT NULL
               REFERENCES {org_schema}.maiml_template_element(element_id) ON DELETE CASCADE,
  value_idx    INT        NOT NULL DEFAULT 0,   -- 複数 <value> の連番（0-origin）
  value        TEXT,                            -- 単一値（value_array が NULL の場合）
  value_array  TEXT[]                           -- スペース区切りリスト値（value が NULL の場合）
);

CREATE INDEX IF NOT EXISTS ix_maiml_tmpl_element_value_element
  ON {org_schema}.maiml_template_element_value(element_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_maiml_tmpl_element_value
  ON {org_schema}.maiml_template_element_value(element_id, value_idx);
