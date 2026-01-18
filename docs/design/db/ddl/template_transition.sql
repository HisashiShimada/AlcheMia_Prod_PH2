-- ===================================================================
-- テーブル名: template_transition (テンプレートトランジション関係)
-- 説明: テンプレートとトランジションの関係を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS template_transition CASCADE;

CREATE TABLE template_transition (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,
    place_id CHARACTER VARYING NOT NULL,
    template_id UUID NOT NULL,
    transition_id CHARACTER VARYING NOT NULL,
    
    -- 制約
    CONSTRAINT template_transition_pkey PRIMARY KEY (organization_id, project_id, method_id, task_no, place_id, template_id, transition_id)
);

-- コメント
COMMENT ON TABLE template_transition IS 'テンプレートトランジション関係';
COMMENT ON COLUMN template_transition.organization_id IS '組織ID';
COMMENT ON COLUMN template_transition.project_id IS 'プロジェクトID';
COMMENT ON COLUMN template_transition.method_id IS 'メソッドID';
COMMENT ON COLUMN template_transition.task_no IS 'タスク連番';
COMMENT ON COLUMN template_transition.place_id IS 'プレースID';
COMMENT ON COLUMN template_transition.template_id IS 'テンプレートID';
COMMENT ON COLUMN template_transition.transition_id IS 'トランジションID';
