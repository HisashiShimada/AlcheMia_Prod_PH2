-- ===================================================================
-- テーブル名: project_task (プロジェクトタスク)
-- 説明: プロジェクトのタスク情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS project_task CASCADE;

CREATE TABLE project_task (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    method_id VARCHAR(255) NOT NULL,
    
    -- タスク情報
    task_name VARCHAR(255),
    experiment_order NUMERIC(2,0),
    experiment_condition NUMERIC(2,0),
    attempts_count NUMERIC(3,0),
    
    -- 制約
    CONSTRAINT project_task_pkey PRIMARY KEY (organization_id, project_id, method_id),
    CONSTRAINT project_task_project_fkey 
        FOREIGN KEY (organization_id, project_id) 
        REFERENCES project(organization_id, project_id)
);

-- インデックス
CREATE INDEX idx_project_task_organization_id ON project_task(organization_id);
CREATE INDEX idx_project_task_project_id ON project_task(project_id);
CREATE INDEX idx_project_task_method_id ON project_task(method_id);

-- コメント
COMMENT ON TABLE project_task IS 'プロジェクトタスク';
COMMENT ON COLUMN project_task.organization_id IS '組織ID';
COMMENT ON COLUMN project_task.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project_task.method_id IS 'メソッドID';
COMMENT ON COLUMN project_task.task_name IS 'タスク名';
COMMENT ON COLUMN project_task.experiment_order IS '実験順序';
COMMENT ON COLUMN project_task.experiment_condition IS '実験条件';
COMMENT ON COLUMN project_task.attempts_count IS '試行回数';
