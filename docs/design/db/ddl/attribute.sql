-- ===================================================================
-- テーブル名: attribute (属性)
-- 説明: 属性情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS attribute CASCADE;

CREATE TABLE attribute (
    -- 主キー
    organization_id UUID NOT NULL,
    attribute_id CHARACTER VARYING NOT NULL,
    
    -- 属性情報
    attribute_name CHARACTER VARYING NOT NULL,
    attribute_value CHARACTER VARYING,
    
    -- 監査証跡
    create_user_id UUID,
    update_user_id UUID,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT attribute_PKC PRIMARY KEY (organization_id, attribute_id)
);

-- コメント
COMMENT ON TABLE attribute IS '属性';
COMMENT ON COLUMN attribute.organization_id IS '組織ID';
COMMENT ON COLUMN attribute.attribute_id IS '属性ID';
COMMENT ON COLUMN attribute.attribute_name IS '属性名';
COMMENT ON COLUMN attribute.attribute_value IS '属性値';
COMMENT ON COLUMN attribute.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN attribute.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN attribute.create_at IS '作成日時';
COMMENT ON COLUMN attribute.update_at IS '更新日時';
