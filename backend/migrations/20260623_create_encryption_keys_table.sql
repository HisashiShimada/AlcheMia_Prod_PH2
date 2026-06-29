-- =============================================================================
-- encryption_keys テーブル作成
-- 暗号化鍵のメタデータを管理するテーブル
-- 実際の鍵ファイルはS3/Swiftに保存する
-- =============================================================================

CREATE TABLE IF NOT EXISTS encryption_keys (
  key_id         UUID         NOT NULL DEFAULT uuid_generate_v4(),
  organization_id UUID        NOT NULL,
  key_name       VARCHAR(255) NOT NULL,
  key_identifier VARCHAR(16)  NOT NULL,  -- SHA-256ハッシュの先頭16文字
  algorithm      VARCHAR(50)  NOT NULL,  -- 'aes256-cbc' | 'aes128-cbc' | 'aes256-gcm'
  key_source     VARCHAR(20)  NOT NULL,  -- 'new_key' | 'load_file' | 'public_key'
  file_path      TEXT         NOT NULL,  -- S3/Swiftのオブジェクトパス
  file_name      VARCHAR(255) NOT NULL,  -- 元のファイル名
  file_size      INTEGER,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by     UUID,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  update_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at     TIMESTAMP,
  last_used_at   TIMESTAMP,
  usage_count    INTEGER      NOT NULL DEFAULT 0,
  description    TEXT,

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
COMMENT ON COLUMN encryption_keys.key_identifier IS '鍵ファイルのSHA-256ハッシュ値の先頭16文字';
COMMENT ON COLUMN encryption_keys.key_source IS 'new_key=新規生成, load_file=ファイル読み込み, public_key=受信者公開鍵';
COMMENT ON COLUMN encryption_keys.file_path IS 'S3/Swiftのオブジェクトパス（organization_idプレフィックスを除く相対パス）';
