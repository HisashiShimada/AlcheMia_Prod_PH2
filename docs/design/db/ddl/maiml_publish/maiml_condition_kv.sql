-- ============================================================
-- maiml_publish.maiml_condition_kv（実験条件 KV）
-- スキーマ: maiml_publish
-- 設計書: docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md § 4.1
-- 作成日: 2026-03-10
-- ============================================================

CREATE TABLE IF NOT EXISTS maiml_publish.maiml_condition_kv (
  asset_id        BIGINT           NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  template_id     TEXT,
  -- NULL の場合は空文字列を格納（PRIMARY KEY に含めるため NOT NULL DEFAULT ''）
  instruction_id  TEXT             NOT NULL DEFAULT '',
  source_section  TEXT             NOT NULL,
  path            TEXT             NOT NULL,
  key             TEXT             NOT NULL,
  idx             INT              NOT NULL DEFAULT 0,
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

-- カラム説明
-- asset_id       : 公開アセットID（FK）
-- template_id    : テンプレートID（conditionTemplate の場合に設定）
-- instruction_id : 指示ID（instruction の場合に設定、NULL の場合は空文字列）
-- source_section : 抽出元セクション（condition / conditionTemplate）
-- path           : KV のパス表現（直下: key、ネスト: 親/子、同名複数: idx=0..）
-- key            : KV のキー名
-- idx            : 同名キーの連番（0始まり）
-- value_text     : 文字列値
-- value_num      : 数値
-- unit           : 単位
-- value_type     : 値の型（double / string / integer 等）
-- format_string  : フォーマット文字列
-- scale_factor   : スケールファクター
