-- ===================================================================
-- テーブル名: pin_codes (PINコード)
-- 説明: メールPINコード二段階認証用の一時データ
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS pin_codes CASCADE;

CREATE TABLE pin_codes (
  organization_id uuid NOT NULL
  , user_id uuid NOT NULL
  , pin_code character varying(6) NOT NULL
  , session_token character varying(255) NOT NULL
  , expires_at timestamp NOT NULL
  , attempts_count integer DEFAULT 0 NOT NULL
  , create_user_id uuid
  , create_at timestamp
  , update_user_id uuid
  , update_at timestamp
  , CONSTRAINT pin_codes_PKC PRIMARY KEY (organization_id,user_id)
) ;

-- インデックス
CREATE INDEX idx_pin_codes_token
  ON pin_codes(session_token);

-- コメント
COMMENT ON TABLE pin_codes IS 'PINコード:メールPINコード二段階認証用の一時データ';
COMMENT ON COLUMN pin_codes.organization_id IS '組織ID';
COMMENT ON COLUMN pin_codes.user_id IS 'ユーザID';
COMMENT ON COLUMN pin_codes.pin_code IS 'PINコード:6桁数字（000000-999999）';
COMMENT ON COLUMN pin_codes.session_token IS 'セッショントークン:temp_session-{id}_{timestamp}';
COMMENT ON COLUMN pin_codes.expires_at IS '有効期限:作成時刻 + 5分';
COMMENT ON COLUMN pin_codes.attempts_count IS '試行回数:0-3';
COMMENT ON COLUMN pin_codes.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN pin_codes.create_at IS '作成日時';
COMMENT ON COLUMN pin_codes.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN pin_codes.update_at IS '更新日時';
