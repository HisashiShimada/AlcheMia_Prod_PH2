-- ===================================================================
-- テーブル名: creator (作成者)
-- 説明: 作成者情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS creator CASCADE;

CREATE TABLE creator (
    -- 複合主キー
    organization_id UUID NOT NULL,
    creator_uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
    
    -- 作成者情報
    creator_id VARCHAR(255) NOT NULL,
    creator_name VARCHAR(255) NOT NULL,
    creator_description VARCHAR(500),
    creator_annotation VARCHAR(500),
    
    -- 制約
    CONSTRAINT creator_pkey PRIMARY KEY (organization_id, creator_uuid),
    CONSTRAINT creator_organization_fkey 
        FOREIGN KEY (organization_id) 
        REFERENCES organization(organization_id)
);

-- インデックス
CREATE INDEX idx_creator_organization_id ON creator(organization_id);
CREATE INDEX idx_creator_id ON creator(creator_id);
CREATE INDEX idx_creator_name ON creator(creator_name);

-- コメント
COMMENT ON TABLE creator IS '作成者マスタ';
COMMENT ON COLUMN creator.organization_id IS '組織ID';
COMMENT ON COLUMN creator.creator_uuid IS '作成者UUID';
COMMENT ON COLUMN creator.creator_id IS '作成者ID';
COMMENT ON COLUMN creator.creator_name IS '作成者名称';
COMMENT ON COLUMN creator.creator_description IS '作成者説明';
COMMENT ON COLUMN creator.creator_annotation IS '作成者注釈';