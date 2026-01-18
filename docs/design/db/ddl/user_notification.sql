-- ===================================================================
-- テーブル名: user_notification (ユーザ別通知)
-- 説明: ユーザ別通知テーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS user_notification CASCADE;

CREATE TABLE user_notification (
    -- 主キー
    notification_id CHARACTER VARYING NOT NULL,
    organization_id UUID NOT NULL,
    user_id CHARACTER VARYING NOT NULL,
    
    -- ステータス
    is_confirmed BOOLEAN,
    
    -- 制約
    CONSTRAINT user_notification_PKC PRIMARY KEY (notification_id, organization_id, user_id)
);

-- コメント
COMMENT ON TABLE user_notification IS 'ユーザ別通知';
COMMENT ON COLUMN user_notification.notification_id IS '通知ID';
COMMENT ON COLUMN user_notification.organization_id IS '組織ID';
COMMENT ON COLUMN user_notification.user_id IS 'ユーザID';
COMMENT ON COLUMN user_notification.is_confirmed IS '確認済フラグ';
