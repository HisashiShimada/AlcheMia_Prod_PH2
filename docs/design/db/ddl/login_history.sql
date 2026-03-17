-- ===================================================================
-- テーブル名: login_history (ログイン履歴)
-- 説明: ログイン履歴テーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS login_history CASCADE;

CREATE TABLE login_history (
    -- 主キー
    id SERIAL NOT NULL,
    
    -- ログイン情報
    user_id CHARACTER VARYING(50) NOT NULL,
    organization_id UUID NOT NULL,
    login_at TIMESTAMP,
    login_sf BOOLEAN,
    failure_reason CHARACTER VARYING(100),
    entry_execute_flg BOOLEAN,
    
    -- セキュリティ情報
    ip_address CHARACTER VARYING(45),
    user_agent TEXT,
    
    -- 監査証跡
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT login_history_PKC PRIMARY KEY (id)
);

-- インデックス
CREATE INDEX idx_login_history_rate_limit ON login_history(login_at, login_sf);
CREATE INDEX idx_login_history_query ON login_history(organization_id,user_id,entry_execute_flg);

-- コメント
COMMENT ON TABLE login_history IS 'ログイン履歴';
COMMENT ON COLUMN login_history.id IS 'ID';
COMMENT ON COLUMN login_history.user_id IS 'ユーザID';
COMMENT ON COLUMN login_history.organization_id IS '組織ID';
COMMENT ON COLUMN login_history.login_at IS 'ログイン日時';
COMMENT ON COLUMN login_history.login_sf IS 'ログイン成否';
COMMENT ON COLUMN login_history.failure_reason IS '失敗原因';
COMMENT ON COLUMN login_history.entry_execute_flg IS '二段階認証実行フラグ';
COMMENT ON COLUMN login_history.ip_address IS 'IPアドレス:セキュリティ監査用（IPv4/IPv6対応）';
COMMENT ON COLUMN login_history.user_agent IS 'User-Agent:ブラウザ・OS情報';
COMMENT ON COLUMN login_history.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN login_history.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN login_history.create_at IS '作成日時';
COMMENT ON COLUMN login_history.update_at IS '更新日時';
