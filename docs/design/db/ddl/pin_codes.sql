-- ===================================================================
-- テーブル名: pin_codes (PINコード)
-- 説明: メールPINコード二段階認証用の一時データ
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS pin_codes CASCADE;

CREATE TABLE pin_codes (
    -- 主キー
    id SERIAL NOT NULL,
    
    -- 認証情報
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    pin_code CHARACTER VARYING(6) NOT NULL,
    session_token CHARACTER VARYING(255) NOT NULL,
    
    -- ステータス
    is_used BOOLEAN DEFAULT false NOT NULL,
    used_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- 試行回数管理
    attempts_count INTEGER DEFAULT 0 NOT NULL,
    max_attempts INTEGER DEFAULT 3 NOT NULL,
    
    -- タイムスタンプ
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- 制約
    CONSTRAINT pin_codes_PKC PRIMARY KEY (id)
);

-- ユニーク制約
ALTER TABLE pin_codes ADD CONSTRAINT idx_pin_codes_pin_session
    UNIQUE (pin_code, session_token);

-- インデックス
CREATE INDEX idx_pin_codes_user ON pin_codes(user_id);
CREATE INDEX idx_pin_codes_token ON pin_codes(session_token);
CREATE INDEX idx_pin_codes_expires ON pin_codes(expires_at);
CREATE INDEX idx_pin_codes_is_used ON pin_codes(is_used);

-- コメント
COMMENT ON TABLE pin_codes IS 'PINコード:メールPINコード二段階認証用の一時データ';
COMMENT ON COLUMN pin_codes.id IS 'ID:uuid_generate_v4()';
COMMENT ON COLUMN pin_codes.user_id IS 'ユーザID';
COMMENT ON COLUMN pin_codes.organization_id IS '組織ID';
COMMENT ON COLUMN pin_codes.pin_code IS 'PINコード:6桁数字（000000-999999）';
COMMENT ON COLUMN pin_codes.session_token IS 'セッショントークン:temp_session-{id}_{timestamp}';
COMMENT ON COLUMN pin_codes.is_used IS '使用済みフラグ';
COMMENT ON COLUMN pin_codes.used_at IS '使用日時';
COMMENT ON COLUMN pin_codes.expires_at IS '有効期限:作成時刻 + 5分';
COMMENT ON COLUMN pin_codes.attempts_count IS '試行回数:0-3';
COMMENT ON COLUMN pin_codes.max_attempts IS '最大試行回数';
COMMENT ON COLUMN pin_codes.created_at IS '作成日時';
