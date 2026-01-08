-- ===================================================================
-- テーブル名: experiment_record (作業記録)
-- 説明: 実験の作業記録を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS experiment_record CASCADE;

CREATE TABLE experiment_record (
    -- 主キー
    record_id SERIAL PRIMARY KEY,
    
    -- 作業記録情報
    task_id VARCHAR(255),
    
    -- 外部キー参照用（将来的に追加される可能性を考慮）
    organization_id UUID,
    project_id UUID,
    method_id VARCHAR(255),
    task_no NUMERIC(3,0)
);

-- インデックス
CREATE INDEX idx_experiment_record_task_id ON experiment_record(task_id);
CREATE INDEX idx_experiment_record_organization_id ON experiment_record(organization_id);
CREATE INDEX idx_experiment_record_project_id ON experiment_record(project_id);

-- コメント
COMMENT ON TABLE experiment_record IS '作業記録';
COMMENT ON COLUMN experiment_record.record_id IS 'レコードID';
COMMENT ON COLUMN experiment_record.task_id IS 'タスクID';
COMMENT ON COLUMN experiment_record.organization_id IS '組織ID';
COMMENT ON COLUMN experiment_record.project_id IS 'プロジェクトID';
COMMENT ON COLUMN experiment_record.method_id IS 'メソッドID';
COMMENT ON COLUMN experiment_record.task_no IS 'タスク連番';