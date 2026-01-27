-- ===================================================================
-- テーブル名: vendor_master (vendorマスタ)
-- 説明: vendorマスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS vendor_master CASCADE;

CREATE TABLE vendor_master (
    -- 主キー
    organization_id UUID NOT NULL,
    vendor_uuid UUID NOT NULL,
    
    -- vendor情報
    vendor_id CHARACTER VARYING NOT NULL,
    vendor_name CHARACTER VARYING NOT NULL,
    vendor_description CHARACTER VARYING,
    vendor_annotation CHARACTER VARYING,
    
    -- ステータス
    is_active BOOLEAN,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT vendor_master_PKC PRIMARY KEY (organization_id, vendor_uuid)
);

-- コメント
COMMENT ON TABLE vendor_master IS 'vendorマスタ';
COMMENT ON COLUMN vendor_master.organization_id IS '組織ID';
COMMENT ON COLUMN vendor_master.vendor_uuid IS 'uuid';
COMMENT ON COLUMN vendor_master.vendor_id IS 'ID';
COMMENT ON COLUMN vendor_master.vendor_name IS '名称';
COMMENT ON COLUMN vendor_master.vendor_description IS '説明';
COMMENT ON COLUMN vendor_master.vendor_annotation IS '注釈';
COMMENT ON COLUMN vendor_master.is_active IS 'アクティブ判定';
COMMENT ON COLUMN vendor_master.create_at IS '作成日時';
COMMENT ON COLUMN vendor_master.update_at IS '更新日時';
