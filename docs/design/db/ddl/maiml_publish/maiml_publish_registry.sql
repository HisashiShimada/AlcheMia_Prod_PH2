-- ============================================================
-- maiml_publish.maiml_publish_registry（公開レジストリ）
-- スキーマ: maiml_publish
-- 設計書: docs/MaiML_OpenData_Pipeline/MaiML_OpenData_Pipeline_BasicDesign_v1.3.md
-- 作成日: 2026-03-10
-- ============================================================
-- TODO: v1.3以前の設計書確認後、既存カラム（PRIMARY KEY / status 等）を確定させる

CREATE TABLE IF NOT EXISTS maiml_publish.maiml_publish_registry (
  registry_id            BIGSERIAL    PRIMARY KEY,
  asset_id               BIGINT       NOT NULL REFERENCES maiml_publish.maiml_asset(asset_id) ON DELETE CASCADE,
  file_uri               TEXT         NOT NULL,
  status                 TEXT         NOT NULL DEFAULT 'requested'
                           CHECK (status IN ('requested','processing','published','unpublished')),
  template_only          BOOLEAN      NOT NULL DEFAULT FALSE,
  store_raw_series       BOOLEAN      NOT NULL DEFAULT FALSE,
  store_raw_raster       BOOLEAN      NOT NULL DEFAULT FALSE,
  raw_chunk_size         INT          NOT NULL DEFAULT 65536,
  raw_compression        TEXT         NOT NULL DEFAULT 'zstd',
  keep_raw_on_unpublish  BOOLEAN      NOT NULL DEFAULT FALSE,
  retention_until        TIMESTAMPTZ,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_registry_asset  ON maiml_publish.maiml_publish_registry(asset_id);
CREATE INDEX IF NOT EXISTS ix_registry_status ON maiml_publish.maiml_publish_registry(status);

-- カラム説明
-- registry_id           : サロゲートキー（BIGSERIAL）
-- asset_id              : 公開アセットID（maiml_asset.asset_id への FK）
-- file_uri              : S3/Swift のファイルパス
-- status                : 公開ステータス（requested / processing / published / unpublished）
-- template_only         : テンプレートのみかどうか
-- store_raw_series      : 生データ(Series)を保存するか
-- store_raw_raster      : 生データ(Raster)を保存するか（将来拡張）
-- raw_chunk_size        : チャンクサイズ（バイト）
-- raw_compression       : 圧縮形式（zstd / gzip / none）
-- keep_raw_on_unpublish : 非公開時も生データを保持するか
-- retention_until       : データ保持期限（NULL = 無期限）
-- created_at            : 登録日時
-- updated_at            : 更新日時
