-- ===================================================================
-- テーブル名: role (ロール)
-- 説明: ロールマスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS role CASCADE;

CREATE TABLE role (
    -- 主キー
    organization_id UUID NOT NULL,
    role_cd CHARACTER VARYING(30) NOT NULL,
    
    -- ロール情報
    role_name CHARACTER VARYING(50),
    initial_screen_function_cd CHARACTER VARYING(30),
    is_active BOOLEAN NOT NULL,
    
    -- 監査証跡
    create_user_id UUID,
    update_user_id UUID,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT role_PKC PRIMARY KEY (organization_id, role_cd)
);

-- コメント
COMMENT ON TABLE role IS 'ロール';
COMMENT ON COLUMN role.organization_id IS '組織ID';
COMMENT ON COLUMN role.role_cd IS 'ロールCD:ユーザのロールCDと同一';
COMMENT ON COLUMN role.role_name IS 'ロール名';
COMMENT ON COLUMN role.initial_screen_function_cd IS '初期画面機能CD';
COMMENT ON COLUMN role.is_active IS 'アクティブ判定';
COMMENT ON COLUMN role.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN role.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN role.create_at IS '作成日時';
COMMENT ON COLUMN role.update_at IS '更新日時';
