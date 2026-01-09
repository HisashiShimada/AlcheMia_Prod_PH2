-- ===================================================================
-- テーブル名: code_master (コードマスタ)
-- 説明: コード情報を管理するマスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS code_master CASCADE;

CREATE TABLE code_master (
    -- 複合主キー
    organization_id UUID NOT NULL,
    code_division VARCHAR(30) NOT NULL,
    code_value VARCHAR(30) NOT NULL,
    
    -- コード情報
    code_name VARCHAR(30) NOT NULL,
    code_description TEXT,
    code_remark TEXT,
    
    -- 制約
    CONSTRAINT code_master_pkey PRIMARY KEY (organization_id, code_division, code_value),
    CONSTRAINT code_master_organization_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organization(organization_id)
);

-- インデックス
CREATE INDEX idx_code_master_organization_id ON code_master(organization_id);
CREATE INDEX idx_code_master_division ON code_master(code_division);
CREATE INDEX idx_code_master_name ON code_master(code_name);

-- コメント
COMMENT ON TABLE code_master IS 'コードマスタ';
COMMENT ON COLUMN code_master.organization_id IS '組織ID';
COMMENT ON COLUMN code_master.code_division IS 'コード区分';
COMMENT ON COLUMN code_master.code_value IS 'コード値';
COMMENT ON COLUMN code_master.code_name IS 'コード名称';
COMMENT ON COLUMN code_master.code_description IS 'コード概要';
COMMENT ON COLUMN code_master.code_remark IS '備考';