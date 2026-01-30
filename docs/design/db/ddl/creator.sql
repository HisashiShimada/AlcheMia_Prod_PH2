-- ===================================================================
-- テーブル名: creator (creator)
-- 説明: creatorテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS creator CASCADE;

CREATE TABLE creator (
    -- 主キー
    organization_id UUID NOT NULL,
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
    
    -- 監査証跡
    create_user_id UUID,
    update_user_id UUID,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT creator_PKC PRIMARY KEY (organization_id, creator_uuid)
);

-- コメント
COMMENT ON TABLE creator IS 'creator';
COMMENT ON COLUMN creator.organization_id IS '組織ID';
COMMENT ON COLUMN creator.creator_uuid IS 'creator_uuid';
COMMENT ON COLUMN creator.vendor_uuid IS 'vendor_uuid';
COMMENT ON COLUMN creator.instrument_uuid IS 'instrument_uuid';
COMMENT ON COLUMN creator.corporation_id IS '会社ID';
COMMENT ON COLUMN creator.creator_id IS 'ID';
COMMENT ON COLUMN creator.creator_name IS '名称';
COMMENT ON COLUMN creator.creator_description IS '説明';
COMMENT ON COLUMN creator.creator_annotation IS '注釈';
COMMENT ON COLUMN creator.is_active IS 'アクティブ判定';
COMMENT ON COLUMN creator.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN creator.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN creator.create_at IS '作成日時';
COMMENT ON COLUMN creator.update_at IS '更新日時';
