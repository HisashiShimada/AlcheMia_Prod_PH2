-- ===================================================================
-- テーブル名: organization (組織)
-- 説明: 組織マスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS organization CASCADE;

CREATE TABLE organization (
    -- 主キー
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    
    -- 組織情報
    organization_name VARCHAR(50),
    organization_display_name VARCHAR(50),
    organization_email VARCHAR(50),
    corporation_code VARCHAR(30),
    
    -- ステータス
    is_active BOOLEAN,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT organization_pkey PRIMARY KEY (organization_id),
    CONSTRAINT organization_corporation_fkey 
        FOREIGN KEY (corporation_code) 
        REFERENCES corporation(corporation_code)
);

-- インデックス
CREATE INDEX idx_organization_corporation_code ON organization(corporation_code);
CREATE INDEX idx_organization_is_active ON organization(is_active);

-- コメント
COMMENT ON TABLE organization IS '組織マスタテーブル';
COMMENT ON COLUMN organization.organization_id IS '組織ID';
COMMENT ON COLUMN organization.organization_name IS '組織名';
COMMENT ON COLUMN organization.organization_display_name IS '組織表示名';
COMMENT ON COLUMN organization.organization_email IS '組織E-mail';
COMMENT ON COLUMN organization.corporation_code IS '会社CD';
COMMENT ON COLUMN organization.is_active IS 'アクティブ判定';
COMMENT ON COLUMN organization.create_at IS '作成日時';
COMMENT ON COLUMN organization.update_at IS '更新日時';
