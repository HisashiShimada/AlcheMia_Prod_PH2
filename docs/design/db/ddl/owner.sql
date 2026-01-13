-- ===================================================================
-- テーブル名: owner (所有者)
-- 説明: 所有者情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS owner CASCADE;

CREATE TABLE owner (
    -- 複合主キー
    organization_id UUID NOT NULL,
    owner_uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
    
    -- 所有者情報
    owner_id VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    owner_description VARCHAR(500),
    owner_annotation VARCHAR(500),
    
    -- 制約
    CONSTRAINT owner_pkey PRIMARY KEY (organization_id, owner_uuid),
    CONSTRAINT owner_organization_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organization(organization_id)
);

-- インデックス
CREATE INDEX idx_owner_organization_id ON owner(organization_id);
CREATE INDEX idx_owner_id ON owner(owner_id);
CREATE INDEX idx_owner_name ON owner(owner_name);

-- コメント
COMMENT ON TABLE owner IS '所有者マスタ';
COMMENT ON COLUMN owner.organization_id IS '組織ID';
COMMENT ON COLUMN owner.owner_uuid IS '所有者UUID';
COMMENT ON COLUMN owner.owner_id IS '所有者ID';
COMMENT ON COLUMN owner.owner_name IS '所有者名称';
COMMENT ON COLUMN owner.owner_description IS '所有者説明';
COMMENT ON COLUMN owner.owner_annotation IS '所有者注釈';