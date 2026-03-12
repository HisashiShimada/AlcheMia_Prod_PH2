-- ===================================================================
-- テーブル名: template_data (テンプレート実績)
-- 説明: テンプレートの実績データを管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS template_data CASCADE;

CREATE TABLE template_data (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id character varying(20) NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,
    place_id CHARACTER VARYING NOT NULL,
    
    -- プロパティセット情報
    property_set JSONB,
    
    -- 監査証跡
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
  , CONSTRAINT template_data_PKC PRIMARY KEY (organization_id,project_id,method_id,task_no,place_id)
);

-- コメント
COMMENT ON TABLE template_data IS 'テンプレート実績';
COMMENT ON COLUMN template_data.organization_id IS '組織ID';
COMMENT ON COLUMN template_data.project_id IS 'プロジェクトID';
COMMENT ON COLUMN template_data.method_id IS 'メソッドID';
COMMENT ON COLUMN template_data.task_no IS 'タスク連番';
COMMENT ON COLUMN template_data.place_id IS 'プレースID';
COMMENT ON COLUMN template_data.property_set IS 'プロパティセット';
COMMENT ON COLUMN template_data.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN template_data.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN template_data.create_at IS '作成日時';
COMMENT ON COLUMN template_data.update_at IS '更新日時';
