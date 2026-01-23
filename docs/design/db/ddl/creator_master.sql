-- ===================================================================
-- テーブル名: creator_master (creatorマスタ)
-- 説明: creatorマスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS creator_master CASCADE;

CREATE TABLE creator_master (
    -- 主キー
    organization_id CHARACTER VARYING NOT NULL,
    creator_uuid UUID NOT NULL,
    
    -- 関連情報
    vendor_uuid UUID,
    instrument_uuid UUID,
    corporation_id UUID,
    
    -- creator情報
    creator_id CHARACTER VARYING NOT NULL,
    creator_name CHARACTER VARYING NOT NULL,
    creator_description CHARACTER VARYING,
    creator_annotation CHARACTER VARYING,
    
    -- ステータス
    is_active BOOLEAN,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT creator_master_PKC PRIMARY KEY (organization_id, creator_uuid)
);

-- コメント
COMMENT ON TABLE creator_master IS 'creatorマスタ';
COMMENT ON COLUMN creator_master.organization_id IS '組織ID';
COMMENT ON COLUMN creator_master.creator_uuid IS 'creator_uuid';
COMMENT ON COLUMN creator_master.vendor_uuid IS 'vendor_uuid';
COMMENT ON COLUMN creator_master.instrument_uuid IS 'instrument_uuid';
COMMENT ON COLUMN creator_master.corporation_id IS '会社ID';
COMMENT ON COLUMN creator_master.creator_id IS 'ID';
COMMENT ON COLUMN creator_master.creator_name IS '名称';
COMMENT ON COLUMN creator_master.creator_description IS '説明';
COMMENT ON COLUMN creator_master.creator_annotation IS '注釈';
COMMENT ON COLUMN creator_master.is_active IS 'アクティブ判定';
COMMENT ON COLUMN creator_master.create_at IS '作成日時';
COMMENT ON COLUMN creator_master.update_at IS '更新日時';
