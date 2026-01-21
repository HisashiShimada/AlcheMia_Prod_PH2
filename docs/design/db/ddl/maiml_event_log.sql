-- ===================================================================
-- テーブル名: maiml_event_log (MaiMLイベントログ)
-- 説明: MaiML形式のイベントログを記録するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS maiml_event_log CASCADE;

CREATE TABLE maiml_event_log (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    sequence_no NUMERIC(5,0) NOT NULL,
    
    -- ログ情報
    log JSONB,
    
    -- 制約
    CONSTRAINT maiml_event_log_pkey PRIMARY KEY (organization_id, project_id, sequence_no)
);

-- コメント
COMMENT ON TABLE maiml_event_log IS 'MaiMLイベントログ';
COMMENT ON COLUMN maiml_event_log.organization_id IS '組織ID';
COMMENT ON COLUMN maiml_event_log.project_id IS 'プロジェクトID';
COMMENT ON COLUMN maiml_event_log.sequence_no IS 'シーケンス番号';
COMMENT ON COLUMN maiml_event_log.log IS 'ログ';
