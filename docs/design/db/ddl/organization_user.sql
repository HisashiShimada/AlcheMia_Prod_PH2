-- ===================================================================
-- テーブル名: organization_user (組織利用者)
-- 説明: 組織利用者テーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS organization_user CASCADE;

CREATE TABLE organization_user (
    -- 主キー
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    
    -- ユーザー情報
    user_name CHARACTER VARYING(30) NOT NULL,
    role_cd CHARACTER VARYING(30) NOT NULL,
    mail_address CHARACTER VARYING(50) NOT NULL,
    department_cd CHARACTER VARYING(50),
    
    -- ステータス
    locked_until TIMESTAMP,
    is_active BOOLEAN,
    
    -- 監査証跡
    create_user_id UUID,
    update_user_id UUID,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT organization_user_PKC PRIMARY KEY (user_id, organization_id)
);

-- コメント
COMMENT ON TABLE organization_user IS '組織利用者';
COMMENT ON COLUMN organization_user.user_id IS 'ユーザID';
COMMENT ON COLUMN organization_user.organization_id IS '組織ID';
COMMENT ON COLUMN organization_user.user_name IS 'ユーザ名';
COMMENT ON COLUMN organization_user.role_cd IS 'ロールCD';
COMMENT ON COLUMN organization_user.mail_address IS 'メールアドレス';
COMMENT ON COLUMN organization_user.department_cd IS '所属部署CD';
COMMENT ON COLUMN organization_user.locked_until IS '有効期限';
COMMENT ON COLUMN organization_user.is_active IS 'アクティブ判定';
COMMENT ON COLUMN organization_user.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN organization_user.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN organization_user.create_at IS '作成日時';
COMMENT ON COLUMN organization_user.update_at IS '更新日時';
