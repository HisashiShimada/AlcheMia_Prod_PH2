-- ===================================================================
-- テーブル名: department (部署)
-- 説明: 部署マスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS department CASCADE;

CREATE TABLE department (
    -- 主キー
    organization_id UUID NOT NULL,
    department_cd VARCHAR(50) NOT NULL,
    
    -- 部署情報
    department_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN NOT NULL,
    
    -- 監査証跡
    create_user_id UUID,
    update_user_id UUID,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT department_pkey PRIMARY KEY (organization_id, department_cd)
);

-- コメント
COMMENT ON TABLE department IS '部署';
COMMENT ON COLUMN department.organization_id IS '組織ID:9eea5300-db8b-4b2d-8e9e-ec306c476b12';
COMMENT ON COLUMN department.department_cd IS '部署CD';
COMMENT ON COLUMN department.department_name IS '部署名';
COMMENT ON COLUMN department.is_active IS 'アクティブ判定';
COMMENT ON COLUMN department.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN department.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN department.create_at IS '作成日時';
COMMENT ON COLUMN department.update_at IS '更新日時';
