-- ============================================================
-- maiml_publish.maiml_series_raw_header（生データヘッダ）
-- スキーマ: maiml_publish
-- 設計書: docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md § 6.1
-- 作成日: 2026-03-10
-- ============================================================

CREATE TABLE IF NOT EXISTS maiml_publish.maiml_series_raw_header (
  raw_id          BIGSERIAL   PRIMARY KEY,
  asset_id        BIGINT      NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  instruction_id  TEXT,
  template_id     TEXT,
  result_id       TEXT,
  result_name     TEXT,
  content_id      TEXT        NOT NULL,
  content_size    INT,
  x_label         TEXT,
  y_label         TEXT,
  x_unit          TEXT,
  y_unit          TEXT,
  points_total    BIGINT      NOT NULL,
  chunk_count     INT         NOT NULL,
  storage_format  TEXT        NOT NULL CHECK (storage_format IN ('array','binary')),
  compression     TEXT        NOT NULL DEFAULT 'none',
  checksum_sha256 TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_raw_header_asset   ON maiml_publish.maiml_series_raw_header(asset_id);
CREATE INDEX IF NOT EXISTS ix_raw_header_content ON maiml_publish.maiml_series_raw_header(asset_id, content_id);

-- カラム説明
-- raw_id          : サロゲートキー（BIGSERIAL）
-- asset_id        : 公開アセットID（FK）
-- instruction_id  : 指示ID
-- template_id     : テンプレートID
-- result_id       : result 要素の ID 属性
-- result_name     : result 要素の name 属性
-- content_id      : content 要素の ID 属性
-- content_size    : content 要素のサイズ
-- x_label / y_label : 軸ラベル
-- x_unit / y_unit   : 軸単位
-- points_total    : 総データ点数
-- chunk_count     : チャンク数
-- storage_format  : チャンク格納形式（array: DOUBLE PRECISION[] / binary: BYTEA）
-- compression     : 圧縮形式（none / zstd / gzip）
-- checksum_sha256 : 全チャンク結合後のSHA-256チェックサム
-- created_at      : 登録日時
