-- ===================================================================
-- テーブル名: organization_user (組織利用者)
-- 説明: 組織利用者テーブル
-- バージョン: 2.0 (2026-08-14)
-- 変更履歴:
--   1.0: 初版作成
--   2.0 (2026-08-14): department_cd 削除、department_unit_id 追加
--                     マイグレーション: backend/migrations/20260617_add_department_unit.sql
--                                       backend/migrations/20260710_drop_department.sql
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS organization_user CASCADE;

CREATE TABLE organization_user (
    -- 主キー
    user_id VARCHAR(50) NOT NULL,
    organization_id UUID NOT NULL,
    
    -- ユーザー情報
    user_name CHARACTER VARYING(30) NOT NULL,
    role_cd CHARACTER VARYING(30) NOT NULL,
    mail_address CHARACTER VARYING(50) NOT NULL,
    department_unit_id VARCHAR(50),
    
    -- ステータス
    is_active BOOLEAN,
    
    -- 監査証跡
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT organization_user_PKC PRIMARY KEY (user_id, organization_id)
);

ALTER TABLE organization_user
  ADD CONSTRAINT fk_org_user_department_unit
  FOREIGN KEY (organization_id, department_unit_id)
  REFERENCES department_unit(organization_id, department_unit_id) ;

-- コメント
COMMENT ON TABLE organization_user IS '組織利用者';
COMMENT ON COLUMN organization_user.user_id IS 'ユーザID';
COMMENT ON COLUMN organization_user.organization_id IS '組織ID';
COMMENT ON COLUMN organization_user.user_name IS 'ユーザ名';
COMMENT ON COLUMN organization_user.role_cd IS 'ロールCD';
COMMENT ON COLUMN organization_user.mail_address IS 'メールアドレス';
COMMENT ON COLUMN organization_user.department_unit_id IS '所属部署ユニットID';
COMMENT ON COLUMN organization_user.is_active IS 'アクティブ判定';
COMMENT ON COLUMN organization_user.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN organization_user.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN organization_user.create_at IS '作成日時';
COMMENT ON COLUMN organization_user.update_at IS '更新日時';
