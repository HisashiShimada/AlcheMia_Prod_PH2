-- ============================================================
-- {org_schema}.maiml_template（protocol 層 テンプレート定義）
--
-- @schema   {org_schema}
-- @description
--   MaiML protocol セクションのテンプレート（material/condition/result）を格納する。
--   maiml_asset の子。maiml_template_element / maiml_template_insertion の親。
--
-- @reference
--   docs/MaiML_OpenData_Pipeline/db.md §4.6
-- ============================================================

CREATE TABLE IF NOT EXISTS {org_schema}.maiml_template (
  template_id      BIGSERIAL  PRIMARY KEY,
  asset_id         BIGINT     NOT NULL
                   REFERENCES {org_schema}.maiml_asset(asset_id) ON DELETE CASCADE,
  template_type    TEXT       NOT NULL
                   CHECK (template_type IN ('result', 'material', 'condition')),
  template_key     TEXT       NOT NULL,   -- テンプレート @id 属性
  template_uuid    TEXT,                  -- テンプレート uuid テキスト
  template_name    TEXT,                  -- テンプレート name テキスト
  template_line_no INT                    -- MaiML ファイル内の行番号
);

CREATE INDEX IF NOT EXISTS ix_maiml_template_asset
  ON {org_schema}.maiml_template(asset_id);
CREATE INDEX IF NOT EXISTS ix_maiml_template_type
  ON {org_schema}.maiml_template(template_type);
CREATE INDEX IF NOT EXISTS ix_maiml_template_key
  ON {org_schema}.maiml_template(template_key);

-- カラム説明
-- template_type : 'result' / 'material' / 'condition'
-- template_key  : MaiML の @id 属性値（例: template_xrfSpectrumData）
--                 maiml_instance.template_ref から参照される（DB FK 制約なし）
