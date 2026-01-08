-- ===================================================================
-- テーブル名: format (フォーマット)
-- 説明: フォーマット情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS format CASCADE;

CREATE TABLE format (
    -- 複合主キー
    organization_id UUID NOT NULL,
    format_id VARCHAR(255) NOT NULL,
    
    -- フォーマット情報
    format_folder_name VARCHAR(255),
    department_id VARCHAR(255),
    file_type NUMERIC(2,0),
    description TEXT,
    
    -- 制約
    CONSTRAINT format_pkey PRIMARY KEY (organization_id, format_id),
    CONSTRAINT format_organization_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organization(organization_id)
);

-- インデックス
CREATE INDEX idx_format_organization_id ON format(organization_id);
CREATE INDEX idx_format_department_id ON format(department_id);
CREATE INDEX idx_format_file_type ON format(file_type);

-- コメント
COMMENT ON TABLE format IS 'フォーマット';
COMMENT ON COLUMN format.organization_id IS '組織ID';
COMMENT ON COLUMN format.format_id IS 'フォーマットID';
COMMENT ON COLUMN format.format_folder_name IS 'フォーマットフォルダ名';
COMMENT ON COLUMN format.department_id IS '部門ID';
COMMENT ON COLUMN format.file_type IS 'ファイル種別（1:MAIML、2:XML）';
COMMENT ON COLUMN format.description IS '概要';