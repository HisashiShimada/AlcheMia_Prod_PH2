-- ===================================================================
-- テーブル名: vendor (ベンダー)
-- 説明: ベンダー情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS vendor CASCADE;

CREATE TABLE vendor (
    -- 複合主キー
    organization_id UUID NOT NULL,
    vendor_uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
    
    -- ベンダー情報
    vendor_id VARCHAR(255) NOT NULL,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_description VARCHAR(500),
    vendor_annotation VARCHAR(500),
    
    -- 制約
    CONSTRAINT vendor_pkey PRIMARY KEY (organization_id, vendor_uuid),
    CONSTRAINT vendor_organization_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organization(organization_id)
);

-- インデックス
CREATE INDEX idx_vendor_organization_id ON vendor(organization_id);
CREATE INDEX idx_vendor_id ON vendor(vendor_id);
CREATE INDEX idx_vendor_name ON vendor(vendor_name);

-- コメント
COMMENT ON TABLE vendor IS 'ベンダーマスタ';
COMMENT ON COLUMN vendor.organization_id IS '組織ID';
COMMENT ON COLUMN vendor.vendor_uuid IS 'ベンダーUUID';
COMMENT ON COLUMN vendor.vendor_id IS 'ベンダーID';
COMMENT ON COLUMN vendor.vendor_name IS 'ベンダー名称';
COMMENT ON COLUMN vendor.vendor_description IS 'ベンダー説明';
COMMENT ON COLUMN vendor.vendor_annotation IS 'ベンダー注釈';