-- 名前空間
DROP TABLE IF EXISTS namespace CASCADE;

CREATE TABLE namespace (
  id                UUID          NOT NULL
  , organization_id UUID          NOT NULL
  , prefix          VARCHAR(255)  NOT NULL
  , uri             TEXT          NOT NULL
  , level           VARCHAR(20)   NOT NULL
  , display_name    VARCHAR(255)
  , description     TEXT
  , parent_id       UUID
  , create_at       TIMESTAMP
  , update_at       TIMESTAMP
  , CONSTRAINT namespace_PKC PRIMARY KEY (id)
) ;

-- 同一組織内で接頭辞は一意
ALTER TABLE namespace ADD CONSTRAINT uk_namespace_org_prefix
  UNIQUE (organization_id, prefix) ;

-- 自己参照FK（組織レベルの親子関係）
ALTER TABLE namespace ADD CONSTRAINT fk_namespace_parent
  FOREIGN KEY (parent_id) REFERENCES namespace(id) ;

COMMENT ON TABLE namespace IS '名前空間';
COMMENT ON COLUMN namespace.id IS '名前空間ID';
COMMENT ON COLUMN namespace.organization_id IS '組織ID';
COMMENT ON COLUMN namespace.prefix IS '接頭辞:xs:NCName規則に準拠。例: MyCompany';
COMMENT ON COLUMN namespace.uri IS '名前空間URI:例: https://www.myco.jp/';
COMMENT ON COLUMN namespace.level IS 'レベル:generic / organization / personal';
COMMENT ON COLUMN namespace.display_name IS '表示名';
COMMENT ON COLUMN namespace.description IS '説明';
COMMENT ON COLUMN namespace.parent_id IS '親名前空間ID:organizationレベルのみ設定可';
COMMENT ON COLUMN namespace.create_at IS '作成日時';
COMMENT ON COLUMN namespace.update_at IS '更新日時';
