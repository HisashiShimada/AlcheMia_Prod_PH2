-- ===================================================================
-- テーブル名: department_unit (部署ユニット)
-- 説明: 部署の下位階層ユニット（チーム）を管理するテーブル
-- バージョン: 2.0 (2026-08-14)
-- 変更履歴:
--   1.0 (2026-06-17): 初版作成
--                     マイグレーション: backend/migrations/20260617_add_department_unit.sql
--   2.0 (2026-08-14): department テーブル廃止に伴い FK (fk_department_unit_department) を削除
--                     マイグレーション: backend/migrations/20260710_drop_department.sql
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS department_unit CASCADE;

CREATE TABLE department_unit (
  organization_id       UUID          NOT NULL
  , department_unit_id  VARCHAR(50)   NOT NULL
  , department_cd       VARCHAR(50)
  , unit_name           VARCHAR(255)  NOT NULL
  , layer               INTEGER       NOT NULL
  , description         TEXT
  , is_active           BOOLEAN       NOT NULL DEFAULT TRUE
  , create_user_id      VARCHAR(50)
  , create_at           TIMESTAMP
  , update_user_id      VARCHAR(50)
  , update_at           TIMESTAMP
  , CONSTRAINT department_unit_PKC PRIMARY KEY (organization_id, department_unit_id)
) ;

ALTER TABLE department_unit ADD CONSTRAINT fk_department_unit_organization
  FOREIGN KEY (organization_id) REFERENCES organization(organization_id) ;

-- ※ fk_department_unit_department は department テーブル廃止（2026-07-10）により削除済み
--    旧FK: FOREIGN KEY (organization_id, department_cd) REFERENCES department(organization_id, department_cd)

COMMENT ON TABLE department_unit IS '部署ユニット';
COMMENT ON COLUMN department_unit.organization_id IS '組織ID';
COMMENT ON COLUMN department_unit.department_unit_id IS '部署ユニットID';
COMMENT ON COLUMN department_unit.department_cd IS '部署CD（廃止予定: department テーブル削除後は参照先なし）';
COMMENT ON COLUMN department_unit.unit_name IS 'ユニット名';
COMMENT ON COLUMN department_unit.layer IS '階層番号:1, 2, 3 ...';
COMMENT ON COLUMN department_unit.description IS '説明';
COMMENT ON COLUMN department_unit.is_active IS 'アクティブ判定';
COMMENT ON COLUMN department_unit.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN department_unit.create_at IS '作成日時';
COMMENT ON COLUMN department_unit.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN department_unit.update_at IS '更新日時';
