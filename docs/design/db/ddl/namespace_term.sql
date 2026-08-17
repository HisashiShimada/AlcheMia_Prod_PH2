-- ===================================================================
-- テーブル名: namespace_term (名前空間用語)
-- 説明: 名前空間に属する用語（ローカル名）を管理するテーブル
-- 変更履歴:
--   1.0 (2026-06-17): 新規作成
--                     マイグレーション: backend/migrations/20260617_create_namespace_tables.sql
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS namespace_term CASCADE;

CREATE TABLE namespace_term (
  organization_id   UUID          NOT NULL
  , namespace_id    VARCHAR(20)   NOT NULL
  , prefix          VARCHAR(255)  NOT NULL
  , localname       VARCHAR(255)  NOT NULL
  , units           VARCHAR(20)
  , xsi_type        VARCHAR(20)
  , is_active       BOOLEAN       NOT NULL
  , display_name    VARCHAR(255)
  , description     TEXT
  , create_at       TIMESTAMP
  , create_user_id  VARCHAR(50)
  , update_at       TIMESTAMP
  , update_user_id  VARCHAR(50)
  , CONSTRAINT namespace_term_PKC PRIMARY KEY (organization_id, namespace_id, prefix, localname)
) ;

ALTER TABLE namespace_term ADD CONSTRAINT fk_namespace_term_namespace
  FOREIGN KEY (organization_id, prefix) REFERENCES namespace(organization_id, prefix) ;

COMMENT ON TABLE namespace_term IS '名前空間用語';
COMMENT ON COLUMN namespace_term.organization_id IS '組織ID';
COMMENT ON COLUMN namespace_term.prefix IS '接頭辞:FK → namespace.prefix';
COMMENT ON COLUMN namespace_term.local_name IS 'ローカル名:xs:NCName規則に準拠。例: SampleTemperature';
COMMENT ON COLUMN namespace_term.display_name IS '表示名';
COMMENT ON COLUMN namespace_term.description IS '説明';
COMMENT ON COLUMN namespace_term.type_hint IS 'データ型ヒント:推奨xsi:type。例: floatType / stringType / intType';
COMMENT ON COLUMN namespace_term.unit_hint IS '単位ヒント:推奨単位。例: celsius / gram / second';
COMMENT ON COLUMN namespace_term.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN namespace_term.create_at IS '作成日時';
COMMENT ON COLUMN namespace_term.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN namespace_term.update_at IS '更新日時';
