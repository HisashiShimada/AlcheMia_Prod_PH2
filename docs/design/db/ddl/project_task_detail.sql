-- ===================================================================
-- テーブル名: project_task_detail (プロジェクトタスク_詳細)
-- 説明: プロジェクトタスクの詳細情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS project_task_detail CASCADE;

CREATE TABLE project_task_detail (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    method_id VARCHAR(255) NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,
    
    -- タスク詳細情報
    task_status NUMERIC(2,0),
    experiment_start_at TIMESTAMP,
    experiment_end_at TIMESTAMP,
    experiment_user_id UUID,
    reviewed_at TIMESTAMP,
    review_user_id UUID,
    
    -- 制約
    CONSTRAINT project_task_detail_pkey PRIMARY KEY (organization_id, project_id, method_id, task_no),
    CONSTRAINT project_task_detail_task_fkey 
        FOREIGN KEY (organization_id, project_id, method_id) 
        REFERENCES project_task(organization_id, project_id, method_id)
);

-- インデックス
CREATE INDEX idx_project_task_detail_organization_id ON project_task_detail(organization_id);
CREATE INDEX idx_project_task_detail_project_id ON project_task_detail(project_id);
CREATE INDEX idx_project_task_detail_method_id ON project_task_detail(method_id);
CREATE INDEX idx_project_task_detail_task_status ON project_task_detail(task_status);
CREATE INDEX idx_project_task_detail_experiment_user_id ON project_task_detail(experiment_user_id);

-- コメント
COMMENT ON TABLE project_task_detail IS 'プロジェクトタスク_詳細';
COMMENT ON COLUMN project_task_detail.organization_id IS '組織ID';
COMMENT ON COLUMN project_task_detail.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project_task_detail.method_id IS 'メソッドID';
COMMENT ON COLUMN project_task_detail.task_no IS 'タスク連番';
COMMENT ON COLUMN project_task_detail.task_status IS 'タスクステータス';
COMMENT ON COLUMN project_task_detail.experiment_start_at IS '実験開始日';
COMMENT ON COLUMN project_task_detail.experiment_end_at IS '実験終了日';
COMMENT ON COLUMN project_task_detail.experiment_user_id IS '実験作業者ID';
COMMENT ON COLUMN project_task_detail.reviewed_at IS 'レビュー完了日';
COMMENT ON COLUMN project_task_detail.review_user_id IS 'レビュアーID';