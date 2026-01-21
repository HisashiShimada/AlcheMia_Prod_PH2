-- ===================================================================
-- テーブル名: issue (問題)
-- 説明: 問題情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS issue CASCADE;

CREATE TABLE issue (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    issue_id CHARACTER VARYING NOT NULL,
    
    -- 問題情報
    issue_target NUMERIC(2,0),
    task_id NUMERIC(3,0),
    transition_id CHARACTER VARYING,
    issue_title CHARACTER VARYING,
    issue_type NUMERIC(2,0),
    issue_contents TEXT,
    status NUMERIC(2,0),
    
    -- 報告・完了情報
    issue_reporter_id UUID,
    issue_report_at TIMESTAMP,
    issue_completer_id UUID,
    issue_complate_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT issue_pkey PRIMARY KEY (organization_id, project_id, issue_id)
);

-- コメント
COMMENT ON TABLE issue IS '問題';
COMMENT ON COLUMN issue.organization_id IS '組織ID';
COMMENT ON COLUMN issue.project_id IS 'プロジェクトID';
COMMENT ON COLUMN issue.issue_id IS '問題ID';
COMMENT ON COLUMN issue.issue_target IS '問題対象';
COMMENT ON COLUMN issue.task_id IS 'タスクID';
COMMENT ON COLUMN issue.transition_id IS 'トランジションID';
COMMENT ON COLUMN issue.issue_title IS '問題タイトル';
COMMENT ON COLUMN issue.issue_type IS '問題タイプ';
COMMENT ON COLUMN issue.issue_contents IS '問題内容';
COMMENT ON COLUMN issue.status IS 'ステータス';
COMMENT ON COLUMN issue.issue_reporter_id IS '問題報告者ID';
COMMENT ON COLUMN issue.issue_report_at IS '問題報告日時';
COMMENT ON COLUMN issue.issue_completer_id IS '問題完了者ID';
COMMENT ON COLUMN issue.issue_complate_at IS '問題完了日時';
