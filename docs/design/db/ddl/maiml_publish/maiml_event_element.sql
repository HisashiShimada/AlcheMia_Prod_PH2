-- ============================================================
-- {org_schema}.maiml_event_element（eventLog 層 汎用データ行）
--
-- @schema   {org_schema}
-- @description
--   maiml_event 配下の property / content 行を格納する。
--   maiml_element / maiml_template_element と同一のカラム構成。
--   ※ parent_element_id による自己参照なし（event 直下の要素のみ）
--
-- @reference
--   docs/MaiML_OpenData_Pipeline/db.md §7.2
--   backend/migrations/20260318_add_event_tables_to_org_schema.sql（初期作成）
--   backend/migrations/20260319_add_columns_to_event_element.sql（カラム追加）
-- ============================================================

CREATE TABLE IF NOT EXISTS {org_schema}.maiml_event_element (
  event_element_id   BIGSERIAL        PRIMARY KEY,
  event_id           BIGINT           NOT NULL
                     REFERENCES {org_schema}.maiml_event(event_id) ON DELETE CASCADE,
  hierarchy          TEXT             NOT NULL,      -- 要素の階層パス（連番）
  element_type       TEXT             NOT NULL,      -- 'property' or 'content'
  description        TEXT,                           -- /description テキスト
  xsi_type           TEXT,                           -- @xsi:type 属性（intType, stringType 等）
  key                TEXT,                           -- @key 属性（property/content 共通）
  format_string      TEXT,                           -- @formatString 属性
  units              TEXT,                           -- @units 属性（単位）
  scale_factor       DOUBLE PRECISION,               -- @scaleFactor 属性
  axis               TEXT,                           -- @axis 属性（content のみ）
  size_value         INT,                            -- @size 属性（content のみ）
  element_id_attr    TEXT,                           -- @id 属性（content のみ）
  element_ref        TEXT,                           -- @ref 属性（content のみ）
  maiml_line_no      INT                             -- MaiML ファイル内の行番号
);

CREATE INDEX IF NOT EXISTS ix_maiml_event_element_event
  ON {org_schema}.maiml_event_element(event_id);
CREATE INDEX IF NOT EXISTS ix_maiml_event_element_key
  ON {org_schema}.maiml_event_element(key);

-- element_type の値
-- 'property' : データプロパティ（@key, @xsi:type, @units 等を持つ）
-- 'content'  : データコンテンツ（@axis, @size 等を持つ。数値配列が多い）
