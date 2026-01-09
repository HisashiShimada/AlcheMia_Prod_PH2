-- ===================================================================
-- テーブル名: project (プロジェクト)
-- 説明: プロジェクト情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS project CASCADE;

CREATE TABLE project (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    
    -- プロジェクト情報
    project_name VARCHAR(255),
    description TEXT,
    department_id UUID,
    owner_user_id UUID,
    project_status NUMERIC(2,0),
    project_maiml_flg BOOLEAN,
    checkout_status NUMERIC(2,0),
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT project_pkey PRIMARY KEY (organization_id, project_id),
    CONSTRAINT project_organization_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organization(organization_id)
);

-- インデックス
CREATE INDEX idx_project_organization_id ON project(organization_id);
CREATE INDEX idx_project_owner_user_id ON project(owner_user_id);
CREATE INDEX idx_project_status ON project(project_status);
CREATE INDEX idx_project_department_id ON project(department_id);

-- コメント
COMMENT ON TABLE project IS 'プロジェクト';
COMMENT ON COLUMN project.organization_id IS '組織ID';
COMMENT ON COLUMN project.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project.project_name IS 'プロジェクト名（プロジェクト名かつフォルダ名）';
COMMENT ON COLUMN project.description IS '概要';
COMMENT ON COLUMN project.department_id IS '部門ID';
COMMENT ON COLUMN project.owner_user_id IS '所有者ユーザID';
COMMENT ON COLUMN project.project_status IS 'プロジェクトステータス';
COMMENT ON COLUMN project.project_maiml_flg IS 'プロジェクトMaiml有無（false:ファイルなし、true:ファイルあり）';
COMMENT ON COLUMN project.checkout_status IS 'チェックアウトステータス';
COMMENT ON COLUMN project.create_at IS '作成日';
