-- ============================================================
-- マイグレーション: namespace / namespace_term テーブル作成
-- 作成日: 2026-06-17
-- 変更内容:
--   - namespace テーブルを新設計で作成
--     （PK を id(UUID) → (organization_id, prefix) に変更）
--     （level(VARCHAR) → global_flg(BOOLEAN) に変更）
--     （namespace_id, department_cd, user_id, scope_key,
--       create_user_id, update_user_id カラム追加）
--   - namespace_term テーブルを新設計で作成
--     （PK を id(UUID) → (organization_id, prefix, local_name) に変更）
--     （namespace_id(UUID) → prefix(VARCHAR(255)) FK に変更）
--     （create_user_id, update_user_id カラム追加）
-- ============================================================

-- 1. namespace テーブルを作成
CREATE TABLE namespace (
  organization_id   UUID          NOT NULL
  , prefix          VARCHAR(255)  NOT NULL
  , namespace_id    VARCHAR(20)   NOT NULL
  , department_cd   VARCHAR(50)
  , user_id         VARCHAR(50)   NOT NULL
  , scope_key       VARCHAR(100)
  , uri             TEXT          NOT NULL
  , global_flg      BOOLEAN       NOT NULL DEFAULT FALSE
  , display_name    VARCHAR(255)
  , description     TEXT
  , parent_id       VARCHAR(255)
  , create_user_id  VARCHAR(50)
  , create_at       TIMESTAMP
  , update_user_id  VARCHAR(50)
  , update_at       TIMESTAMP
  , CONSTRAINT namespace_PKC PRIMARY KEY (organization_id, prefix)
) ;

-- 自己参照FK（親名前空間）
ALTER TABLE namespace ADD CONSTRAINT fk_namespace_parent
  FOREIGN KEY (organization_id, parent_id) REFERENCES namespace(organization_id, prefix) ;

COMMENT ON TABLE namespace IS '名前空間';
COMMENT ON COLUMN namespace.organization_id IS '組織ID';
COMMENT ON COLUMN namespace.prefix IS '接頭辞:xs:NCName規則に準拠。例: MyCompany';
COMMENT ON COLUMN namespace.namespace_id IS '名前空間ID';
COMMENT ON COLUMN namespace.department_cd IS '部署CD';
COMMENT ON COLUMN namespace.user_id IS 'ユーザID';
COMMENT ON COLUMN namespace.scope_key IS 'スコープキー';
COMMENT ON COLUMN namespace.uri IS '名前空間URI:例: https://www.myco.jp/';
COMMENT ON COLUMN namespace.global_flg IS 'グローバルフラグ:TRUE=グローバル(全組織共通) FALSE=組織固有';
COMMENT ON COLUMN namespace.display_name IS '表示名';
COMMENT ON COLUMN namespace.description IS '説明';
COMMENT ON COLUMN namespace.parent_id IS '親名前空間ID（prefix）';
COMMENT ON COLUMN namespace.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN namespace.create_at IS '作成日時';
COMMENT ON COLUMN namespace.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN namespace.update_at IS '更新日時';

-- 2. namespace_term テーブルを作成
CREATE TABLE namespace_term (
  organization_id   UUID          NOT NULL
  , prefix          VARCHAR(255)  NOT NULL
  , local_name      VARCHAR(255)  NOT NULL
  , display_name    VARCHAR(255)
  , description     TEXT
  , type_hint       VARCHAR(100)
  , unit_hint       VARCHAR(100)
  , create_user_id  VARCHAR(50)
  , create_at       TIMESTAMP
  , update_user_id  VARCHAR(50)
  , update_at       TIMESTAMP
  , CONSTRAINT namespace_term_PKC PRIMARY KEY (organization_id, prefix, local_name)
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
