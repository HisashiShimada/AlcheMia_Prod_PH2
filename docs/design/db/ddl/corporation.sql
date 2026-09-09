-- ===================================================================
-- テーブル名: corporation (会社)
-- 説明: 会社マスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS corporation CASCADE;

CREATE TABLE corporation (
    -- 主キー
    corporation_id UUID NOT NULL,
    
    -- 会社情報
    corporation_name CHARACTER VARYING(50) NOT NULL,
    is_active BOOLEAN NOT NULL,
    
    -- 監査証跡
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    
    -- タイムスタンプ
    create_at TIMESTAMPTZ,
    update_at TIMESTAMPTZ,
    
    -- 制約
    CONSTRAINT corporation_PKC PRIMARY KEY (corporation_id)
);

-- コメント
COMMENT ON TABLE corporation IS '会社';
COMMENT ON COLUMN corporation.corporation_id IS '会社ID';
COMMENT ON COLUMN corporation.corporation_name IS '会社名';
COMMENT ON COLUMN corporation.is_active IS 'アクティブ判定';
COMMENT ON COLUMN corporation.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN corporation.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN corporation.create_at IS '作成日時';
COMMENT ON COLUMN corporation.update_at IS '更新日時';
