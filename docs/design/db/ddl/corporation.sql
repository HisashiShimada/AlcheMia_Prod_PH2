-- ===================================================================
-- テーブル名: corporation (会社)
-- 説明: 会社マスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS corporation CASCADE;

CREATE TABLE corporation (
    -- 主キー
    corporation_code VARCHAR(30) NOT NULL,
    
    -- 会社情報
    corporation_name VARCHAR(50),
    
    -- 制約
    CONSTRAINT corporation_pkey PRIMARY KEY (corporation_code)
);

-- コメント
COMMENT ON TABLE corporation IS '会社マスタテーブル';
COMMENT ON COLUMN corporation.corporation_code IS '会社CD';
COMMENT ON COLUMN corporation.corporation_name IS '会社名';
