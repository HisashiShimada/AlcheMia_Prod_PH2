-- ===================================================================
-- テーブル名: role_permission (ロール権限)
-- 説明: ロール権限マスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS role_permission CASCADE;

CREATE TABLE role_permission (
    -- 主キー
    organization_id UUID NOT NULL,
    role_id CHARACTER VARYING(30) NOT NULL,
    function_id CHARACTER VARYING(30) NOT NULL,
    
    -- 権限情報
    permission INTEGER NOT NULL,
    
    -- 制約
    CONSTRAINT role_permission_PKC PRIMARY KEY (organization_id, role_id, function_id)
);

-- コメント
COMMENT ON TABLE role_permission IS 'ロール権限';
COMMENT ON COLUMN role_permission.organization_id IS '組織ID';
COMMENT ON COLUMN role_permission.role_id IS 'ロール';
COMMENT ON COLUMN role_permission.function_id IS '機能ID:機能名はソースで管理';
COMMENT ON COLUMN role_permission.permission IS '権限:0:書込専用 1:読取権限';
