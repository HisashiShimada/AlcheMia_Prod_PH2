-- ===================================================================
-- テーブル名: issue (問題)
-- 説明: 問題情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS issue CASCADE;

CREATE TABLE issue (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id character varying(20) NOT NULL,
    issue_id CHARACTER VARYING NOT NULL,
    
    -- 問題情報
    method_id CHARACTER VARYING,
    issue_target NUMERIC(2,0),
    task_no NUMERIC(3,0),
    transition_id CHARACTER VARYING,
    issue_title CHARACTER VARYING,
    issue_type NUMERIC(2,0),
    issue_contents TEXT,
    status NUMERIC(2,0),
    
    -- 報告・完了情報
    issue_reporter_id VARCHAR(50),
    issue_report_at TIMESTAMPTZ,
    issue_completer_id VARCHAR(50),
    issue_complate_at TIMESTAMPTZ,
    
    -- 監査証跡
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    
    -- タイムスタンプ
    create_at TIMESTAMPTZ,
    update_at TIMESTAMPTZ,
    
    -- 制約
    CONSTRAINT issue_pkey PRIMARY KEY (organization_id, project_id, issue_id)
);

-- インデックス（パフォーマンス最適化）
-- 問題一覧取得用複合インデックス（organization_id + project_id + status）
CREATE INDEX idx_issue_org_project_status
    ON issue (organization_id, project_id, status);

-- 問題一覧取得用複合インデックス（organization_id + project_id + create_at）
CREATE INDEX idx_issue_org_project_created
    ON issue (organization_id, project_id, create_at DESC);

-- タスクレベル絞り込み用インデックス
CREATE INDEX idx_issue_org_method_task
    ON issue (organization_id, method_id, task_no)
    WHERE issue_target IS NOT NULL;

-- トランジションレベル絞り込み用インデックス
CREATE INDEX idx_issue_org_transition
    ON issue (organization_id, transition_id)
    WHERE transition_id IS NOT NULL;

-- コメント
COMMENT ON TABLE issue IS '問題';
COMMENT ON COLUMN issue.organization_id IS '組織ID';
COMMENT ON COLUMN issue.project_id IS 'プロジェクトID';
COMMENT ON COLUMN issue.issue_id IS '問題ID';
COMMENT ON COLUMN issue.method_id IS 'メソッドID';
COMMENT ON COLUMN issue.issue_target IS '問題対象';
COMMENT ON COLUMN issue.task_no IS 'タスク連番';
COMMENT ON COLUMN issue.transition_id IS 'トランジションID';
COMMENT ON COLUMN issue.issue_title IS '問題タイトル';
COMMENT ON COLUMN issue.issue_type IS '問題タイプ';
COMMENT ON COLUMN issue.issue_contents IS '問題内容';
COMMENT ON COLUMN issue.status IS 'ステータス';
COMMENT ON COLUMN issue.issue_reporter_id IS '問題報告者ID';
COMMENT ON COLUMN issue.issue_report_at IS '問題報告日時';
COMMENT ON COLUMN issue.issue_completer_id IS '問題完了者ID';
COMMENT ON COLUMN issue.issue_complate_at IS '問題完了日時';
COMMENT ON COLUMN issue.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN issue.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN issue.create_at IS '作成日時';
COMMENT ON COLUMN issue.update_at IS '更新日時';
