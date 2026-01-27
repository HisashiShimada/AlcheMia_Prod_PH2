-- ===================================================================
-- テーブル名: instrument_master (instrumentマスタ)
-- 説明: instrumentマスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS instrument_master CASCADE;

CREATE TABLE instrument_master (
    -- 主キー
    organization_id UUID NOT NULL,
    instrument_uuid UUID NOT NULL,
    
    -- instrument情報
    instrument_id CHARACTER VARYING NOT NULL,
    instrument_name CHARACTER VARYING NOT NULL,
    instrument_description CHARACTER VARYING,
    instrument_annotation CHARACTER VARYING,
    
    -- ステータス
    is_active BOOLEAN,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT instrument_master_PKC PRIMARY KEY (organization_id, instrument_uuid)
);

-- コメント
COMMENT ON TABLE instrument_master IS 'instrumentマスタ';
COMMENT ON COLUMN instrument_master.organization_id IS '組織ID';
COMMENT ON COLUMN instrument_master.instrument_uuid IS 'uuid';
COMMENT ON COLUMN instrument_master.instrument_id IS 'ID';
COMMENT ON COLUMN instrument_master.instrument_name IS '名称';
COMMENT ON COLUMN instrument_master.instrument_description IS '説明';
COMMENT ON COLUMN instrument_master.instrument_annotation IS '注釈';
COMMENT ON COLUMN instrument_master.is_active IS 'アクティブ判定';
COMMENT ON COLUMN instrument_master.create_at IS '作成日時';
COMMENT ON COLUMN instrument_master.update_at IS '更新日時';
