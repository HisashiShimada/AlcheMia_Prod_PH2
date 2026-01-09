-- ===================================================================
-- テーブル名: function (機能)
-- 説明: 機能マスタテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS function CASCADE;

CREATE TABLE function (
    -- 主キー
    function_id VARCHAR(30) NOT NULL,
    
    -- 機能情報
    permission VARCHAR(30) NOT NULL,
    
    -- 制約
    CONSTRAINT function_pkey PRIMARY KEY (function_id)
);

-- コメント
COMMENT ON TABLE function IS '機能マスタテーブル';
COMMENT ON COLUMN function.function_id IS '機能ID';
COMMENT ON COLUMN function.permission IS '機能名';
