-- ===================================================================
-- テーブル名: template_data (テンプレート実績)
-- 説明: テンプレートの実績データを管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS template_data CASCADE;

CREATE TABLE template_data (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,
    template_id UUID NOT NULL,
    place_id CHARACTER VARYING NOT NULL,
    
    -- テンプレート情報
    "テンプレートタイプ" NUMERIC(2,0),
    property_value CHARACTER VARYING,
    
    -- 制約
    CONSTRAINT template_data_pkey PRIMARY KEY (organization_id, project_id, method_id, task_no, template_id, place_id)
);

-- コメント
COMMENT ON TABLE template_data IS 'テンプレート実績';
COMMENT ON COLUMN template_data.organization_id IS '組織ID';
COMMENT ON COLUMN template_data.project_id IS 'プロジェクトID';
COMMENT ON COLUMN template_data.method_id IS 'メソッドID';
COMMENT ON COLUMN template_data.task_no IS 'タスク連番';
COMMENT ON COLUMN template_data.template_id IS 'テンプレートID';
COMMENT ON COLUMN template_data.place_id IS 'プレースID';
COMMENT ON COLUMN template_data."テンプレートタイプ" IS 'テンプレートタイプ';
COMMENT ON COLUMN template_data.property_value IS 'プロパティ値';
