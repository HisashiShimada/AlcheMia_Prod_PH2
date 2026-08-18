-- プレフィックス
DROP TABLE IF EXISTS prefix CASCADE;

CREATE TABLE prefix (
  organization_id   UUID          NOT NULL
  , namespace_id    VARCHAR(20)   NOT NULL
  , prefix          VARCHAR(255)  NOT NULL
  , description     TEXT
  , is_active       BOOLEAN
  , create_user_id  VARCHAR(50)
  , update_user_id  VARCHAR(50)
  , create_at       TIMESTAMP
  , update_at       TIMESTAMP
  , CONSTRAINT prefix_PKC PRIMARY KEY (organization_id, namespace_id, prefix)
) ;

COMMENT ON TABLE prefix IS 'プレフィックス';
COMMENT ON COLUMN prefix.organization_id IS '組織ID';
COMMENT ON COLUMN prefix.namespace_id IS '名前空間ID:FK → namespace.namespace_id';
COMMENT ON COLUMN prefix.prefix IS 'プレフィックス:xs:NCName規則に準拠。例: MyCompany';
COMMENT ON COLUMN prefix.description IS '説明';
COMMENT ON COLUMN prefix.is_active IS 'アクティブ判定:TRUE=有効 FALSE=無効';
COMMENT ON COLUMN prefix.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN prefix.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN prefix.create_at IS '作成日時';
COMMENT ON COLUMN prefix.update_at IS '更新日時';
