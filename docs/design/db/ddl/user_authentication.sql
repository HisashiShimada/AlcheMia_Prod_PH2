-- ===================================================================
-- テーブル名: user_authentication (利用者認証)
-- 説明: ユーザー認証情報テーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS user_authentication CASCADE;

CREATE TABLE user_authentication (
    -- 複合主キー
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    
    -- 認証情報
    password VARCHAR(50) NOT NULL,
    entry_flg BOOLEAN NOT NULL,
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT user_authentication_pkey PRIMARY KEY (user_id, organization_id),
    CONSTRAINT user_authentication_user_fkey 
        FOREIGN KEY (user_id, organization_id) 
        REFERENCES organization_user(user_id, organization_id)
);

-- インデックス
CREATE INDEX idx_user_authentication_user ON user_authentication(user_id, organization_id);

-- コメント
COMMENT ON TABLE user_authentication IS 'ユーザー認証情報テーブル';
COMMENT ON COLUMN user_authentication.user_id IS 'ユーザID';
COMMENT ON COLUMN user_authentication.organization_id IS '組織ID';
COMMENT ON COLUMN user_authentication.password IS 'ハッシュパスワード';
COMMENT ON COLUMN user_authentication.entry_flg IS '二段階認証アプリ連携フラグ';
COMMENT ON COLUMN user_authentication.create_at IS '作成日時';
COMMENT ON COLUMN user_authentication.update_at IS '更新日時';
