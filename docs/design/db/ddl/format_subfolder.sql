-- ===================================================================
-- テーブル名: format_subfolder (フォーマット_サブフォルダ)
-- 説明: フォーマットのサブフォルダ情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS format_subfolder CASCADE;

CREATE TABLE format_subfolder (
    -- 複合主キー
    organization_id UUID NOT NULL,
    format_id VARCHAR(255) NOT NULL,
    subfolder_id SERIAL,
    
    -- サブフォルダ情報
    parent_folder_name VARCHAR(255),
    sub_folder_name VARCHAR(255),
    
    -- 制約
    CONSTRAINT format_subfolder_pkey PRIMARY KEY (organization_id, format_id, subfolder_id),
    CONSTRAINT format_subfolder_format_fkey 
        FOREIGN KEY (organization_id, format_id) 
        REFERENCES format(organization_id, format_id)
);

-- インデックス
CREATE INDEX idx_format_subfolder_organization_id ON format_subfolder(organization_id);
CREATE INDEX idx_format_subfolder_format_id ON format_subfolder(format_id);
CREATE INDEX idx_format_subfolder_parent_folder ON format_subfolder(parent_folder_name);

-- コメント
COMMENT ON TABLE format_subfolder IS 'フォーマット_サブフォルダ';
COMMENT ON COLUMN format_subfolder.organization_id IS '組織ID';
COMMENT ON COLUMN format_subfolder.format_id IS 'フォーマットID';
COMMENT ON COLUMN format_subfolder.subfolder_id IS 'サブフォルダID（連番）';
COMMENT ON COLUMN format_subfolder.parent_folder_name IS '親フォルダ名';
COMMENT ON COLUMN format_subfolder.sub_folder_name IS 'サブフォルダ名';