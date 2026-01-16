-- ===================================================================
-- テーブル名: system_notification (システム通知)
-- 説明: システム通知テーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS system_notification CASCADE;

CREATE TABLE system_notification (
    -- 主キー
    notification_id CHARACTER VARYING NOT NULL,
    
    -- 通知対象
    organization_id UUID,
    role CHARACTER VARYING,
    
    -- 通知情報
    notification_title CHARACTER VARYING,
    notification_detail CHARACTER VARYING,
    notification_from TIMESTAMP,
    noticfication_to TIMESTAMP,
    
    -- ステータス
    is_confirmed BOOLEAN,
    
    -- 制約
    CONSTRAINT system_notification_PKC PRIMARY KEY (notification_id)
);

-- コメント
COMMENT ON TABLE system_notification IS 'システム通知';
COMMENT ON COLUMN system_notification.notification_id IS '通知ID';
COMMENT ON COLUMN system_notification.organization_id IS '組織ID';
COMMENT ON COLUMN system_notification.role IS 'ロール';
COMMENT ON COLUMN system_notification.notification_title IS '通知内容_タイトル';
COMMENT ON COLUMN system_notification.notification_detail IS '通知内容_詳細';
COMMENT ON COLUMN system_notification.notification_from IS '通知期間From';
COMMENT ON COLUMN system_notification.noticfication_to IS '通知期間To';
COMMENT ON COLUMN system_notification.is_confirmed IS '確認済フラグ';
