-- ========================================
-- 認証関連テーブル作成SQL (PostgreSQL)
-- 作成日: 2026-01-06
-- 更新日: 2026-01-07 - user_id列をUUID型に変更
-- ページ: 材料開発データ管理システム_認証関連_ER図
-- ========================================

-- UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. corporation (会社)
-- ========================================
CREATE TABLE public.corporation (
    corporation_code VARCHAR(30) NOT NULL,
    corporation_name VARCHAR(50),
    CONSTRAINT corporation_PKC PRIMARY KEY (corporation_code)
);

COMMENT ON TABLE corporation IS '会社マスタ';
COMMENT ON COLUMN corporation.corporation_code IS '会社CD';
COMMENT ON COLUMN corporation.corporation_name IS '会社名';

-- ========================================
-- 2. organization (組織)
-- ========================================
CREATE TABLE public.organization (
    organization_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    organization_name VARCHAR(50),
    organization_display_name VARCHAR(50),
    organization_email VARCHAR(50),
    corporation_code VARCHAR(30),
    is_active BOOLEAN,
    create_at TIMESTAMP WITH TIME ZONE,
    update_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT organization_PKC PRIMARY KEY (organization_id),
    CONSTRAINT organization_FK1 FOREIGN KEY (corporation_code) 
        REFERENCES corporation(corporation_code)
);

COMMENT ON TABLE organization IS '組織マスタ';
COMMENT ON COLUMN organization.organization_id IS '組織ID';
COMMENT ON COLUMN organization.organization_name IS '組織名';
COMMENT ON COLUMN organization.organization_display_name IS '組織表示名';
COMMENT ON COLUMN organization.organization_email IS '組織E-mail';
COMMENT ON COLUMN organization.corporation_code IS '会社CD';
COMMENT ON COLUMN organization.is_active IS 'アクティブ判定';
COMMENT ON COLUMN organization.create_at IS '作成日時';
COMMENT ON COLUMN organization.update_at IS '更新日時';

-- ========================================
-- 3. organization_user (組織利用者)
-- ========================================
CREATE TABLE public.organization_user (
    user_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    user_name VARCHAR(30) NOT NULL,
    role VARCHAR(30) NOT NULL,
    mail_address VARCHAR(50) NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN,
    create_at TIMESTAMP WITH TIME ZONE,
    update_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT organization_user_PKC PRIMARY KEY (user_id, organization_id),
    CONSTRAINT organization_user_FK1 FOREIGN KEY (organization_id) 
        REFERENCES organization(organization_id)
);

COMMENT ON TABLE organization_user IS '組織利用者マスタ';
COMMENT ON COLUMN organization_user.user_id IS 'ユーザID';
COMMENT ON COLUMN organization_user.organization_id IS '組織ID';
COMMENT ON COLUMN organization_user.user_name IS 'ユーザ名';
COMMENT ON COLUMN organization_user.role IS 'ロール';
COMMENT ON COLUMN organization_user.mail_address IS 'メールアドレス';
COMMENT ON COLUMN organization_user.locked_until IS '有効期限';
COMMENT ON COLUMN organization_user.last_login IS '最終ログイン日時';
COMMENT ON COLUMN organization_user.is_active IS 'アクティブ判定';
COMMENT ON COLUMN organization_user.create_at IS '作成日時';
COMMENT ON COLUMN organization_user.update_at IS '更新日時';

-- ========================================
-- 4. user_authentication (利用者認証)
-- ========================================
CREATE TABLE public.user_authentication (
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    password VARCHAR(255) NOT NULL,
    entry_flg BOOLEAN NOT NULL,
    create_at TIMESTAMP WITH TIME ZONE,
    update_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT user_authentication_PKC PRIMARY KEY (user_id, organization_id),
    CONSTRAINT user_authentication_FK1 FOREIGN KEY (user_id, organization_id) 
        REFERENCES organization_user(user_id, organization_id)
);

COMMENT ON TABLE user_authentication IS '利用者認証情報';
COMMENT ON COLUMN user_authentication.user_id IS 'ユーザID';
COMMENT ON COLUMN user_authentication.organization_id IS '組織ID';
COMMENT ON COLUMN user_authentication.password IS 'ハッシュパスワード';
COMMENT ON COLUMN user_authentication.entry_flg IS '二段階認証アプリ連携フラグ';
COMMENT ON COLUMN user_authentication.create_at IS '作成日時';
COMMENT ON COLUMN user_authentication.update_at IS '更新日時';

-- ========================================
-- 5. login_history (ログイン履歴)
-- ========================================
CREATE TABLE public.login_history (
    id VARCHAR(30) NOT NULL,
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    login_at TIMESTAMP WITH TIME ZONE,
    login_sf VARCHAR(10),
    failure_reason VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    CONSTRAINT login_history_PKC PRIMARY KEY (id)
);

COMMENT ON TABLE login_history IS 'ログイン履歴';
COMMENT ON COLUMN login_history.id IS 'ID';
COMMENT ON COLUMN login_history.user_id IS 'ユーザID';
COMMENT ON COLUMN login_history.organization_id IS '組織ID';
COMMENT ON COLUMN login_history.login_at IS 'ログイン日時';
COMMENT ON COLUMN login_history.login_sf IS 'ログイン成否';
COMMENT ON COLUMN login_history.failure_reason IS '失敗原因';
COMMENT ON COLUMN login_history.ip_address IS 'IPアドレス - セキュリティ監査用（IPv4/IPv6対応）';
COMMENT ON COLUMN login_history.user_agent IS 'User-Agent - ブラウザ・OS情報';

-- インデックス作成
CREATE INDEX idx_login_history_rate_limit 
    ON login_history(organization_code, user_id, login_at, login_sf);

-- ========================================
-- 6. pin_codes (PINコード)
-- ========================================
CREATE TABLE public.pin_codes (
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    org_id UUID NOT NULL,
    pin_code VARCHAR(6) NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pin_codes_PKC PRIMARY KEY (id),
    CONSTRAINT pin_codes_FK1 FOREIGN KEY (user_id, org_id) 
        REFERENCES organization_user(user_id, organization_id)
);

COMMENT ON TABLE pin_codes IS 'PINコード - メールPINコード二段階認証用の一時データ';
COMMENT ON COLUMN pin_codes.id IS 'ID';
COMMENT ON COLUMN pin_codes.user_id IS 'ユーザID';
COMMENT ON COLUMN pin_codes.org_id IS '組織ID';
COMMENT ON COLUMN pin_codes.pin_code IS 'PINコード - 6桁数字（000000-999999）';
COMMENT ON COLUMN pin_codes.session_token IS 'セッショントークン - temp_session-{id}_{timestamp}';
COMMENT ON COLUMN pin_codes.is_used IS '使用済みフラグ';
COMMENT ON COLUMN pin_codes.used_at IS '使用日時';
COMMENT ON COLUMN pin_codes.expires_at IS '有効期限 - 作成時刻 + 5分';
COMMENT ON COLUMN pin_codes.attempts_count IS '試行回数 - 0-3';
COMMENT ON COLUMN pin_codes.max_attempts IS '最大試行回数';
COMMENT ON COLUMN pin_codes.created_at IS '作成日時';

-- インデックス作成
CREATE UNIQUE INDEX idx_pin_codes_pin_session 
    ON pin_codes(pin_code, session_token);
CREATE INDEX idx_pin_codes_user 
    ON pin_codes(user_id, org_id);
CREATE INDEX idx_pin_codes_token 
    ON pin_codes(session_token);
CREATE INDEX idx_pin_codes_expires 
    ON pin_codes(expires_at);
CREATE INDEX idx_pin_codes_is_used 
    ON pin_codes(is_used);

-- ========================================
-- 7. function (機能)
-- ========================================
CREATE TABLE public.function (
    function_id VARCHAR(30) NOT NULL,
    permission VARCHAR(30) NOT NULL,
    CONSTRAINT function_PKC PRIMARY KEY (function_id)
);

COMMENT ON TABLE function IS '機能マスタ';
COMMENT ON COLUMN function.function_id IS '機能ID';
COMMENT ON COLUMN function.permission IS '機能名';

-- ========================================
-- 8. role_permission (ロール権限)
-- ========================================
CREATE TABLE public.role_permission (
    role VARCHAR(30) NOT NULL,
    function_id VARCHAR(30) NOT NULL,
    permission VARCHAR(30) NOT NULL,
    CONSTRAINT role_permission_PKC PRIMARY KEY (role, function_id),
    CONSTRAINT role_permission_FK1 FOREIGN KEY (function_id) 
        REFERENCES function(function_id)
);

COMMENT ON TABLE role_permission IS 'ロール権限マスタ';
COMMENT ON COLUMN role_permission.role IS 'ロール - ユーザのロールと同一';
COMMENT ON COLUMN role_permission.function_id IS '機能ID - 画面単位の機能ID';
COMMENT ON COLUMN role_permission.permission IS '権限 - CRUDの権限';

-- ========================================
-- テーブル作成完了
-- ========================================
