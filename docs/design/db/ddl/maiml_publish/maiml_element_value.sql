-- ============================================================
-- {org_schema}.maiml_element_value（data 層 value 展開）
--
-- @schema   {org_schema}
-- @description
--   maiml_element の <value> 子要素を展開して格納する。
--   1 要素に複数 <value> がある場合は value_idx（0-origin）で区別。
--   スペース区切りのリスト値は value_array（TEXT[]）に格納。
--
-- @reference
--   docs/MaiML_OpenData_Pipeline/db.md §4.4
-- ============================================================

CREATE TABLE IF NOT EXISTS {org_schema}.maiml_element_value (
  value_id     BIGSERIAL  PRIMARY KEY,
  element_id   BIGINT     NOT NULL
               REFERENCES {org_schema}.maiml_element(element_id) ON DELETE CASCADE,
  value_idx    INT        NOT NULL DEFAULT 0,   -- 複数 <value> の連番（0-origin）
  value        TEXT,                            -- 単一値（value_array が NULL の場合）
  value_array  TEXT[]                           -- スペース区切りリスト値（value が NULL の場合）
);

CREATE INDEX IF NOT EXISTS ix_maiml_element_value_element
  ON {org_schema}.maiml_element_value(element_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_maiml_element_value
  ON {org_schema}.maiml_element_value(element_id, value_idx);

-- 登録方針
-- <value> テキストをスペース区切りで分割した結果が 2 要素以上 → value_array に格納、value は NULL
-- 1 要素                                                        → value に格納、value_array は NULL
-- 取得側: COALESCE(value_array[1], value) で統一アクセス可能
