-- ===================================================================
-- テーブル名: code_master (コードマスタ)
-- 説明: コードマスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS code_master CASCADE;

CREATE TABLE code_master (
    -- 主キー
    organization_id UUID NOT NULL,
    code_division CHARACTER VARYING(30) NOT NULL,
    code_value CHARACTER VARYING(30) NOT NULL,
    
    -- コード情報
    code_description TEXT,
    code_name CHARACTER VARYING(30) NOT NULL,
    code_remark TEXT,
    
    -- 監査証跡
    create_user_id UUID,
    update_user_id UUID,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT code_master_PKC PRIMARY KEY (organization_id, code_division, code_value)
);

-- コメント
COMMENT ON TABLE code_master IS 'コードマスタ';
COMMENT ON COLUMN code_master.organization_id IS '組織ID';
COMMENT ON COLUMN code_master.code_division IS 'コード区分';
COMMENT ON COLUMN code_master.code_value IS 'コード値';
COMMENT ON COLUMN code_master.code_description IS 'コード概要';
COMMENT ON COLUMN code_master.code_name IS 'コード名称';
COMMENT ON COLUMN code_master.code_remark IS '備考';
COMMENT ON COLUMN code_master.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN code_master.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN code_master.create_at IS '作成日時';
COMMENT ON COLUMN code_master.update_at IS '更新日時';
