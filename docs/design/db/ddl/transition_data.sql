-- ===================================================================
-- テーブル名: transition_data (トランジション実績)
-- 説明: トランジションの実績データを管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS transition_data CASCADE;

CREATE TABLE transition_data (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,
    transition_id CHARACTER VARYING NOT NULL,
    
    -- トランジション情報
    status NUMERIC(2,0),
    progress_rate NUMERIC(3,0),
    
    -- 制約
    CONSTRAINT transition_data_pkey PRIMARY KEY (organization_id, project_id, method_id, task_no, transition_id)
);

-- コメント
COMMENT ON TABLE transition_data IS 'トランジション実績';
COMMENT ON COLUMN transition_data.organization_id IS '組織ID';
COMMENT ON COLUMN transition_data.project_id IS 'プロジェクトID';
COMMENT ON COLUMN transition_data.method_id IS 'メソッドID';
COMMENT ON COLUMN transition_data.task_no IS 'タスク連番';
COMMENT ON COLUMN transition_data.transition_id IS 'トランジションID';
COMMENT ON COLUMN transition_data.status IS 'ステータス';
COMMENT ON COLUMN transition_data.progress_rate IS '進捗率';
