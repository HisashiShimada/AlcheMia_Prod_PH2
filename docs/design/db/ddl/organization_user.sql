-- ===================================================================
-- テーブル名: organization_user (組織利用者)
-- 説明: 組織に所属する利用者テーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS organization_user CASCADE;

CREATE TABLE organization_user (
    -- 複合主キー
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    
    -- ユーザー情報
    user_name VARCHAR(30) NOT NULL,
    role VARCHAR(30) NOT NULL,
    mail_address VARCHAR(50) NOT NULL,
    
    -- ステータス
    locked_until TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT organization_user_pkey PRIMARY KEY (user_id, organization_id),
    CONSTRAINT organization_user_organization_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organization(organization_id)
);

-- インデックス
CREATE INDEX idx_organization_user_organization_id ON organization_user(organization_id);
CREATE INDEX idx_organization_user_role ON organization_user(role);
CREATE INDEX idx_organization_user_mail ON organization_user(mail_address);
CREATE INDEX idx_organization_user_is_active ON organization_user(is_active);

-- コメント
COMMENT ON TABLE organization_user IS '組織に所属する利用者テーブル';
COMMENT ON COLUMN organization_user.user_id IS 'ユーザID';
COMMENT ON COLUMN organization_user.organization_id IS '組織ID';
COMMENT ON COLUMN organization_user.user_name IS 'ユーザ名';
COMMENT ON COLUMN organization_user.role IS 'ロール';
COMMENT ON COLUMN organization_user.mail_address IS 'メールアドレス';
COMMENT ON COLUMN organization_user.locked_until IS '有効期限';
COMMENT ON COLUMN organization_user.last_login IS '最終ログイン日時';
COMMENT ON COLUMN organization_user.is_active IS 'アクティブ判定';
COMMENT ON COLUMN organization_user.create_at IS '作成日時';
COMMENT ON COLUMN organization_user.update_at IS '更新日時';
