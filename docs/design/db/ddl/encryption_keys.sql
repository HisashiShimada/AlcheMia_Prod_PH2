-- ===================================================================
-- テーブル名: encryption_keys (暗号化鍵)
-- 説明: 暗号化鍵のメタデータを管理するテーブル。実際の鍵ファイルはS3/Swiftに保存する。
-- バージョン: 1.0 (2026-06-23)
-- 変更履歴:
--   1.0 (2026-06-23): 新規作成
--                     マイグレーション: backend/migrations/20260623_create_encryption_keys_table.sql
-- ===================================================================

CREATE TABLE IF NOT EXISTS encryption_keys (
  key_id          UUID         NOT NULL DEFAULT uuid_generate_v4(),
  organization_id UUID         NOT NULL,
  key_name        VARCHAR(255) NOT NULL,
  key_identifier  VARCHAR(16)  NOT NULL,
  algorithm       VARCHAR(50)  NOT NULL,
  key_source      VARCHAR(20)  NOT NULL,
  file_path       TEXT         NOT NULL,
  file_name       VARCHAR(255) NOT NULL,
  file_size       INTEGER,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by      UUID,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at      TIMESTAMP,
  last_used_at    TIMESTAMP,
  usage_count     INTEGER      NOT NULL DEFAULT 0,
  description     TEXT,

  CONSTRAINT pk_encryption_keys PRIMARY KEY (key_id),
  CONSTRAINT fk_encryption_keys_organization
    FOREIGN KEY (organization_id)
    REFERENCES organization(organization_id)
    ON DELETE CASCADE,
  CONSTRAINT fk_encryption_keys_created_by
    FOREIGN KEY (created_by)
    REFERENCES users(user_id)
    ON DELETE SET NULL,
  CONSTRAINT uq_encryption_keys_identifier
    UNIQUE (organization_id, key_identifier),
  CONSTRAINT chk_encryption_keys_algorithm
    CHECK (algorithm IN ('aes256-cbc', 'aes128-cbc', 'aes256-gcm')),
  CONSTRAINT chk_encryption_keys_source
    CHECK (key_source IN ('new_key', 'load_file', 'public_key'))
);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_organization
  ON encryption_keys(organization_id);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_identifier
  ON encryption_keys(key_identifier);

CREATE INDEX IF NOT EXISTS idx_encryption_keys_active
  ON encryption_keys(organization_id, is_active);

COMMENT ON TABLE encryption_keys IS '暗号化鍵メタデータ管理テーブル。実際の鍵ファイルはS3/Swiftに保存。';
COMMENT ON COLUMN encryption_keys.key_id IS '鍵ID（UUID）';
COMMENT ON COLUMN encryption_keys.organization_id IS '組織ID';
COMMENT ON COLUMN encryption_keys.key_name IS '鍵名称';
COMMENT ON COLUMN encryption_keys.key_identifier IS '鍵ファイルのSHA-256ハッシュ値の先頭16文字';
COMMENT ON COLUMN encryption_keys.algorithm IS '暗号化アルゴリズム: aes256-cbc / aes128-cbc / aes256-gcm';
COMMENT ON COLUMN encryption_keys.key_source IS 'new_key=新規生成, load_file=ファイル読み込み, public_key=受信者公開鍵';
COMMENT ON COLUMN encryption_keys.file_path IS 'S3/Swiftのオブジェクトパス（organization_idプレフィックスを除く相対パス）';
COMMENT ON COLUMN encryption_keys.file_name IS '元のファイル名';
COMMENT ON COLUMN encryption_keys.file_size IS 'ファイルサイズ（バイト）';
COMMENT ON COLUMN encryption_keys.is_active IS 'アクティブ判定';
COMMENT ON COLUMN encryption_keys.created_by IS '作成者ユーザID';
COMMENT ON COLUMN encryption_keys.created_at IS '作成日時';
COMMENT ON COLUMN encryption_keys.update_at IS '更新日時';
COMMENT ON COLUMN encryption_keys.expires_at IS '有効期限';
COMMENT ON COLUMN encryption_keys.last_used_at IS '最終使用日時';
COMMENT ON COLUMN encryption_keys.usage_count IS '使用回数';
COMMENT ON COLUMN encryption_keys.description IS '説明';
