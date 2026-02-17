-- ===================================================================
-- テーブル名: instrument (instrument)
-- 説明: instrumentテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS instrument CASCADE;

CREATE TABLE instrument (
    -- 主キー
    organization_id UUID NOT NULL,
    instrument_uuid UUID NOT NULL,

    --関連情報
    corporation_id UUID,
    
    -- instrument情報
    instrument_id CHARACTER VARYING NOT NULL,
    instrument_name CHARACTER VARYING NOT NULL,
    instrument_description CHARACTER VARYING,
    instrument_annotation CHARACTER VARYING,
    
    -- ステータス
    is_active BOOLEAN,
    
    -- 監査証跡
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT instrument_PKC PRIMARY KEY (organization_id, instrument_uuid)
);

-- コメント
COMMENT ON TABLE instrument IS 'instrument';
COMMENT ON COLUMN instrument.organization_id IS '組織ID';
COMMENT ON COLUMN instrument.instrument_uuid IS 'uuid';
COMMENT ON COLUMN instrument.corporation_id IS '会社ID';
COMMENT ON COLUMN instrument.instrument_id IS 'ID';
COMMENT ON COLUMN instrument.instrument_name IS '名称';
COMMENT ON COLUMN instrument.instrument_description IS '説明';
COMMENT ON COLUMN instrument.instrument_annotation IS '注釈';
COMMENT ON COLUMN instrument.is_active IS 'アクティブ判定';
COMMENT ON COLUMN instrument.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN instrument.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN instrument.create_at IS '作成日時';
COMMENT ON COLUMN instrument.update_at IS '更新日時';
