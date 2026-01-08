-- ===================================================================
-- テーブル名: instrument (実験装置)
-- 説明: 実験装置情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS instrument CASCADE;

CREATE TABLE instrument (
    -- 複合主キー
    organization_id UUID NOT NULL,
    instrument_uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
    
    -- 実験装置情報
    instrument_id VARCHAR(255) NOT NULL,
    instrument_name VARCHAR(255) NOT NULL,
    instrument_description VARCHAR(500),
    instrument_annotation VARCHAR(500),
    
    -- 制約
    CONSTRAINT instrument_pkey PRIMARY KEY (organization_id, instrument_uuid),
    CONSTRAINT instrument_organization_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organization(organization_id)
);

-- インデックス
CREATE INDEX idx_instrument_organization_id ON instrument(organization_id);
CREATE INDEX idx_instrument_id ON instrument(instrument_id);
CREATE INDEX idx_instrument_name ON instrument(instrument_name);

-- コメント
COMMENT ON TABLE instrument IS '実験装置マスタ';
COMMENT ON COLUMN instrument.organization_id IS '組織ID';
COMMENT ON COLUMN instrument.instrument_uuid IS '実験装置UUID';
COMMENT ON COLUMN instrument.instrument_id IS '実験装置ID';
COMMENT ON COLUMN instrument.instrument_name IS '実験装置名称';
COMMENT ON COLUMN instrument.instrument_description IS '実験装置説明';
COMMENT ON COLUMN instrument.instrument_annotation IS '実験装置注釈';