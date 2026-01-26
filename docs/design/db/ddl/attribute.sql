-- ===================================================================
-- テーブル名: attribute (属性)
-- 説明: 属性情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS attribute CASCADE;

CREATE TABLE attribute (
    -- 複合主キー
    organization_id UUID NOT NULL,
    attribute_id VARCHAR(255) NOT NULL,
    
    -- 属性情報
    attribute_name VARCHAR(255) NOT NULL,
    attribute_value VARCHAR(500) NOT NULL,
    
    -- 制約
    CONSTRAINT attribute_pkey PRIMARY KEY (organization_id, attribute_id)
);

-- インデックス
CREATE INDEX idx_attribute_organization_id ON attribute(organization_id);
CREATE INDEX idx_attribute_name ON attribute(attribute_name);

-- コメント
COMMENT ON TABLE attribute IS '属性マスタ';
COMMENT ON COLUMN attribute.organization_id IS '組織ID';
COMMENT ON COLUMN attribute.attribute_id IS '属性ID';
COMMENT ON COLUMN attribute.attribute_name IS '属性名称';
COMMENT ON COLUMN attribute.attribute_value IS '属性値';