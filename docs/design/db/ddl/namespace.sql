-- ===================================================================
-- テーブル名: namespace (名前空間)
-- 説明: MAIMLで使用する名前空間を管理するテーブル
-- バージョン: 2.0 (2026-06-17)
-- 変更履歴:
--   1.0: 初版作成（PK: organization_id + namespace_id, level カラムあり）
--   2.0 (2026-06-17): 新設計に全面変更
--                     - PK を (organization_id, namespace_id) → (organization_id, prefix) に変更
--                     - level(VARCHAR) → global_flg(BOOLEAN) に変更
--                     - prefix, department_cd, user_id, scope_key, display_name,
--                       description, parent_id, create_user_id, update_user_id カラム追加
--                     マイグレーション: backend/migrations/20260617_create_namespace_tables.sql
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS namespace CASCADE;

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
