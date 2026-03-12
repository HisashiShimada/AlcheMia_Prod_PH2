-- ===================================================================
-- テーブル名: transition_data (トランジション実績)
-- 説明: トランジションの実績データを管理するテーブル
-- バージョン: 2.0 (2026-02-03)

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS transition_data CASCADE;

CREATE TABLE transition_data (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id character varying(20) NOT NULL,
    method_id CHARACTER VARYING NOT NULL,
    task_no NUMERIC(3,0) NOT NULL,
    transition_id CHARACTER VARYING NOT NULL,
    
    -- トランジション情報
    status NUMERIC(2,0),
    progress_rate NUMERIC(3,0),
    
    -- 監査証跡
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
  , CONSTRAINT transition_data_PKC PRIMARY KEY (organization_id,project_id,method_id,task_no,transition_id)
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
COMMENT ON COLUMN transition_data.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN transition_data.create_at IS '作成日時';
COMMENT ON COLUMN transition_data.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN transition_data.update_at IS '更新日時';
