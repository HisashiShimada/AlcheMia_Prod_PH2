-- ===================================================================
-- テーブル名: organization (組織)
-- 説明: 組織マスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS organization CASCADE;

CREATE TABLE organization (
    -- 主キー
    organization_id UUID NOT NULL,
    
    -- 組織情報
    organization_name CHARACTER VARYING(50),
    organization_display_name CHARACTER VARYING(50),
    organization_email CHARACTER VARYING(50),
    chief_user_id CHARACTER VARYING(50),
    corporation_id UUID,
    
    -- ステータス
    is_active BOOLEAN,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT organization_PKC PRIMARY KEY (organization_id)
);

-- コメント
COMMENT ON TABLE organization IS '組織';
COMMENT ON COLUMN organization.organization_id IS '組織ID:9eea5300-db8b-4b2d-8e9e-ec306c476b12';
COMMENT ON COLUMN organization.organization_name IS '組織名';
COMMENT ON COLUMN organization.organization_display_name IS '組織表示名';
COMMENT ON COLUMN organization.organization_email IS '組織E-mail';
COMMENT ON COLUMN organization.chief_user_id IS '代表者ユーザID';
COMMENT ON COLUMN organization.corporation_id IS '会社ID';
COMMENT ON COLUMN organization.is_active IS 'アクティブ判定';
COMMENT ON COLUMN organization.create_at IS '作成日時';
COMMENT ON COLUMN organization.update_at IS '更新日時';
