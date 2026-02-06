-- ===================================================================
-- テーブル名: vendor (vendor)
-- 説明: vendorテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS vendor CASCADE;

CREATE TABLE vendor (
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
    
    -- 監査証跡
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT vendor_PKC PRIMARY KEY (organization_id, vendor_uuid)
);

-- コメント
COMMENT ON TABLE vendor IS 'vendor';
COMMENT ON COLUMN vendor.organization_id IS '組織ID';
COMMENT ON COLUMN vendor.vendor_uuid IS 'uuid';
COMMENT ON COLUMN vendor.vendor_id IS 'ID';
COMMENT ON COLUMN vendor.vendor_name IS '名称';
COMMENT ON COLUMN vendor.vendor_description IS '説明';
COMMENT ON COLUMN vendor.vendor_annotation IS '注釈';
COMMENT ON COLUMN vendor.is_active IS 'アクティブ判定';
COMMENT ON COLUMN vendor.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN vendor.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN vendor.create_at IS '作成日時';
COMMENT ON COLUMN vendor.update_at IS '更新日時';
