-- ===================================================================
-- テーブル名: role_permission (ロール権限)
-- 説明: ロール権限マスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS role_permission CASCADE;

CREATE TABLE role_permission (
    -- 主キー
    organization_id UUID NOT NULL,
    role_cd CHARACTER VARYING(30) NOT NULL,
    function_cd CHARACTER VARYING(30) NOT NULL,
    
    -- 権限情報
    permission INTEGER NOT NULL,
    
    -- 監査証跡
    create_user_id UUID,
    update_user_id UUID,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT role_permission_PKC PRIMARY KEY (organization_id,role_cd,function_cd)
);

-- コメント
COMMENT ON TABLE role_permission IS 'ロール権限';
COMMENT ON COLUMN role_permission.organization_id IS '組織ID';
COMMENT ON COLUMN role_permission.role_cd IS 'ロールCD';
COMMENT ON COLUMN role_permission.function_cd IS '機能CD:機能名はソースで管理';
COMMENT ON COLUMN role_permission.permission IS '権限:0:書込可 1:読取専用';
COMMENT ON COLUMN role_permission.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN role_permission.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN role_permission.create_at IS '作成日時';
COMMENT ON COLUMN role_permission.update_at IS '更新日時';
