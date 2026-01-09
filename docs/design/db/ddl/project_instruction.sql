-- ===================================================================
-- テーブル名: project_instruction (プロジェクト指示)
-- 説明: プロジェクトの実験指示情報を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS project_instruction CASCADE;

CREATE TABLE project_instruction (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    experiment_instruction_id VARCHAR(255) NOT NULL,
    
    -- 指示情報
    instruction_target NUMERIC(2,0),
    priority NUMERIC(2,0),
    type NUMERIC(2,0),
    task_no NUMERIC(3,0),
    transition_id VARCHAR(255),
    instructions TEXT,
    instruction_user_id UUID,
    instruction_date TIMESTAMP,
    
    -- 制約
    CONSTRAINT project_instruction_pkey PRIMARY KEY (organization_id, project_id, experiment_instruction_id),
    CONSTRAINT project_instruction_project_fkey 
        FOREIGN KEY (organization_id, project_id) 
        REFERENCES project(organization_id, project_id)
);

-- インデックス
CREATE INDEX idx_project_instruction_organization_id ON project_instruction(organization_id);
CREATE INDEX idx_project_instruction_project_id ON project_instruction(project_id);
CREATE INDEX idx_project_instruction_target ON project_instruction(instruction_target);
CREATE INDEX idx_project_instruction_user_id ON project_instruction(instruction_user_id);
CREATE INDEX idx_project_instruction_date ON project_instruction(instruction_date);

-- コメント
COMMENT ON TABLE project_instruction IS 'プロジェクト指示';
COMMENT ON COLUMN project_instruction.organization_id IS '組織ID';
COMMENT ON COLUMN project_instruction.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project_instruction.experiment_instruction_id IS '実験指示ID';
COMMENT ON COLUMN project_instruction.instruction_target IS '指示対象（1:ファイル全体、2:タスク、3:トランジション）';
COMMENT ON COLUMN project_instruction.priority IS '優先度';
COMMENT ON COLUMN project_instruction.type IS 'タイプ';
COMMENT ON COLUMN project_instruction.task_no IS 'タスク連番';
COMMENT ON COLUMN project_instruction.transition_id IS 'トランジションID';
COMMENT ON COLUMN project_instruction.instructions IS '指示内容';
COMMENT ON COLUMN project_instruction.instruction_user_id IS '実験指示ユーザID';
COMMENT ON COLUMN project_instruction.instruction_date IS '指示送信日';