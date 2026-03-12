-- ============================================================
-- maiml_publish.maiml_series_preview（プレビュー）
-- スキーマ: maiml_publish
-- 設計書: docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md § 5.4
-- 作成日: 2026-03-10
-- ============================================================

CREATE TABLE IF NOT EXISTS maiml_publish.maiml_series_preview (
  preview_id        BIGSERIAL          PRIMARY KEY,
  asset_id          BIGINT             NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  instruction_id    TEXT,
  template_id       TEXT,
  result_id         TEXT,
  result_name       TEXT,
  content_id        TEXT,
  content_size      INT,
  series_type       TEXT               NOT NULL CHECK (series_type IN ('TIC','SPECTRUM_TOTAL','OTHER')),
  x_label           TEXT               NOT NULL,
  y_label           TEXT               NOT NULL,
  mode              TEXT               NOT NULL CHECK (mode IN ('uniform','maxhold','mmr')),
  params            JSONB              NOT NULL DEFAULT '{}'::jsonb,
  original_points   INT                NOT NULL,
  preview_points    INT                NOT NULL,
  x                 DOUBLE PRECISION[] NOT NULL,
  y                 DOUBLE PRECISION[] NOT NULL,
  x_min             DOUBLE PRECISION,
  x_max             DOUBLE PRECISION,
  y_min             DOUBLE PRECISION,
  y_max             DOUBLE PRECISION,
  quality           JSONB,
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_preview_asset_type     ON maiml_publish.maiml_series_preview(asset_id, series_type);
CREATE INDEX IF NOT EXISTS ix_preview_instruction    ON maiml_publish.maiml_series_preview(instruction_id);
CREATE INDEX IF NOT EXISTS ix_preview_template       ON maiml_publish.maiml_series_preview(template_id);
CREATE INDEX IF NOT EXISTS ix_preview_result_content ON maiml_publish.maiml_series_preview(result_id, content_id);

-- カラム説明
-- preview_id      : サロゲートキー（BIGSERIAL）
-- asset_id        : 公開アセットID（FK）
-- instruction_id  : 指示ID
-- template_id     : テンプレートID
-- result_id       : result 要素の ID 属性
-- result_name     : result 要素の name 属性
-- content_id      : content 要素の ID 属性
-- content_size    : content 要素のサイズ（元データ点数）
-- series_type     : 系列の種別（TIC / SPECTRUM_TOTAL / OTHER）
-- x_label         : X軸ラベル
-- y_label         : Y軸ラベル
-- mode            : プレビュー生成モード（uniform / maxhold / mmr）
-- params          : プレビュー生成パラメータ（JSON）
-- original_points : 元データ点数
-- preview_points  : プレビュー点数
-- x               : X値配列
-- y               : Y値配列
-- x_min / x_max   : X値の範囲
-- y_min / y_max   : Y値の範囲
-- quality         : 品質指標（MAE / MAPE / Peak Recall / Area保持率）
-- created_at      : 登録日時
