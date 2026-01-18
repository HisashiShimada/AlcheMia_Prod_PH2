-- ===================================================================
-- テーブル名: event_log (イベントログ)
-- 説明: イベントログを記録するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS event_log CASCADE;

CREATE TABLE event_log (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,
    sequence_no NUMERIC(5,0) NOT NULL,
    
    -- ログ情報
    log CHARACTER VARYING,
    
    -- 制約
    CONSTRAINT event_log_pkey PRIMARY KEY (organization_id, project_id, method_id, task_no, sequence_no)
);

-- コメント
COMMENT ON TABLE event_log IS 'イベントログ';
COMMENT ON COLUMN event_log.organization_id IS '組織ID';
COMMENT ON COLUMN event_log.project_id IS 'プロジェクトID';
COMMENT ON COLUMN event_log.method_id IS 'メソッドID';
COMMENT ON COLUMN event_log.task_no IS 'タスク連番';
COMMENT ON COLUMN event_log.sequence_no IS 'シーケンス番号';
COMMENT ON COLUMN event_log.log IS 'ログ';
