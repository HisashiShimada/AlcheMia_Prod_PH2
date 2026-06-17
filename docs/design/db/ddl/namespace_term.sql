-- 名前空間用語
DROP TABLE IF EXISTS namespace_term CASCADE;

CREATE TABLE namespace_term (
  id                UUID          NOT NULL
  , namespace_id    UUID          NOT NULL
  , local_name      VARCHAR(255)  NOT NULL
  , display_name    VARCHAR(255)
  , description     TEXT
  , type_hint       VARCHAR(100)
  , unit_hint       VARCHAR(100)
  , create_at       TIMESTAMP
  , update_at       TIMESTAMP
  , CONSTRAINT namespace_term_PKC PRIMARY KEY (id)
) ;

-- 同一名前空間内でローカル名は一意
ALTER TABLE namespace_term ADD CONSTRAINT uk_namespace_term_ns_localname
  UNIQUE (namespace_id, local_name) ;

ALTER TABLE namespace_term ADD CONSTRAINT fk_namespace_term_namespace
  FOREIGN KEY (namespace_id) REFERENCES namespace(id) ;

COMMENT ON TABLE namespace_term IS '名前空間用語';
COMMENT ON COLUMN namespace_term.id IS '用語ID';
COMMENT ON COLUMN namespace_term.namespace_id IS '所属名前空間ID';
COMMENT ON COLUMN namespace_term.local_name IS 'ローカル名:xs:NCName規則に準拠。例: SampleTemperature';
COMMENT ON COLUMN namespace_term.display_name IS '表示名';
COMMENT ON COLUMN namespace_term.description IS '説明';
COMMENT ON COLUMN namespace_term.type_hint IS 'データ型ヒント:推奨xsi:type。例: floatType / stringType / intType';
COMMENT ON COLUMN namespace_term.unit_hint IS '単位ヒント:推奨単位。例: celsius / gram / second';
COMMENT ON COLUMN namespace_term.create_at IS '作成日時';
COMMENT ON COLUMN namespace_term.update_at IS '更新日時';
