-- ===================================================================
-- テーブル名: instruction_acknowledged_history (指示確認履歴)
-- 説明: 実験指示の確認履歴を管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS instruction_acknowledged_history CASCADE;

CREATE TABLE instruction_acknowledged_history (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    experiment_instruction_id CHARACTER VARYING NOT NULL,
    experiment_user_id UUID NOT NULL,
    
    -- 確認情報
    acknowledged_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT instruction_acknowledged_history_pkey PRIMARY KEY (organization_id, project_id, experiment_instruction_id, experiment_user_id)
);

-- コメント
COMMENT ON TABLE instruction_acknowledged_history IS '指示確認履歴';
COMMENT ON COLUMN instruction_acknowledged_history.organization_id IS '組織ID';
COMMENT ON COLUMN instruction_acknowledged_history.project_id IS 'プロジェクトID';
COMMENT ON COLUMN instruction_acknowledged_history.experiment_instruction_id IS '実験指示ID';
COMMENT ON COLUMN instruction_acknowledged_history.experiment_user_id IS '実験作業者ID';
COMMENT ON COLUMN instruction_acknowledged_history.acknowledged_at IS '確認日時';
