-- ============================================================
-- {org_schema}.maiml_instance（data 層インスタンス）
--
-- @schema   {org_schema}
-- @description
--   result / material / condition インスタンスを格納する。
--   maiml_asset の子。maiml_element / maiml_insertion の親。
--   results_id は eventLog 層（maiml_event.results_ref）との結合キー。
--
-- @reference
--   docs/MaiML_OpenData_Pipeline/db.md §4.2
-- ============================================================

CREATE TABLE IF NOT EXISTS {org_schema}.maiml_instance (
  instance_id      BIGSERIAL  PRIMARY KEY,
  asset_id         BIGINT     NOT NULL
                   REFERENCES {org_schema}.maiml_asset(asset_id) ON DELETE CASCADE,
  instance_type    TEXT       NOT NULL
                   CHECK (instance_type IN ('result', 'material', 'condition')),
  instance_key     TEXT       NOT NULL,         -- インスタンス @id 属性
  results_id       TEXT,                        -- data/results/@id（eventLog層との結合キー）
  template_ref     TEXT,                        -- インスタンス @ref 属性（template_key を参照）
  instance_uuid    TEXT,                        -- インスタンス uuid テキスト
  instance_name    TEXT,                        -- インスタンス name テキスト
  instance_line_no INT                          -- MaiML ファイル内の行番号
);

CREATE INDEX IF NOT EXISTS ix_maiml_instance_asset
  ON {org_schema}.maiml_instance(asset_id);
CREATE INDEX IF NOT EXISTS ix_maiml_instance_type
  ON {org_schema}.maiml_instance(instance_type);
CREATE INDEX IF NOT EXISTS ix_maiml_instance_key
  ON {org_schema}.maiml_instance(instance_key);
CREATE INDEX IF NOT EXISTS ix_maiml_instance_results_id
  ON {org_schema}.maiml_instance(asset_id, results_id);
CREATE INDEX IF NOT EXISTS ix_maiml_instance_template
  ON {org_schema}.maiml_instance(template_ref);

-- カラム説明
-- instance_type   : 'result' / 'material' / 'condition'
-- instance_key    : MaiML の @id 属性値（例: result_xrfSpectrumData）
-- results_id      : 親 <results> タグの @id。eventLog 層 maiml_event.results_ref と JOIN するキー。
--                   同一 asset_id 内で結合: JOIN ON e.results_ref = i.results_id AND e.asset_id = i.asset_id
-- template_ref    : @ref 属性。maiml_template.template_key を参照（DB FK 制約なし）
