-- ===================================================================
-- テーブル名: role (ロール)
-- 説明: ロールマスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS role CASCADE;

CREATE TABLE role (
    -- 主キー
    organization_id UUID NOT NULL,
    role_id CHARACTER VARYING(30) NOT NULL,
    
    -- ロール情報
    role_name CHARACTER VARYING,
    is_active BOOLEAN NOT NULL,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT role_PKC PRIMARY KEY (organization_id, role_id)
);

-- コメント
COMMENT ON TABLE role IS 'ロール';
COMMENT ON COLUMN role.organization_id IS '組織ID';
COMMENT ON COLUMN role.role_id IS 'ロール:ユーザのロールと同一';
COMMENT ON COLUMN role.role_name IS 'ロール名';
COMMENT ON COLUMN role.is_active IS 'アクティブ判定';
COMMENT ON COLUMN role.create_at IS '作成日時';
COMMENT ON COLUMN role.update_at IS '更新日時';
