-- ===================================================================
-- テーブル名: instruction_acknowledged_history (指示確認履歴)
-- 説明: 実験指示の確認履歴を管理するテーブル（監査証跡）
-- バージョン: 3.0 (2026-02-24)
-- 変更: ER図に準拠して主キー構造を変更
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS instruction_acknowledged_history CASCADE;

CREATE TABLE instruction_acknowledged_history (
    -- 主キー（複合キー）
    organization_id UUID NOT NULL,
    project_id character varying(20) NOT NULL,
    experiment_instruction_id VARCHAR NOT NULL,
    experiment_user_id VARCHAR(50) NOT NULL,
    
    -- 確認情報
    acknowledged_at TIMESTAMPTZ,
    
    -- 監査情報
    create_user_id VARCHAR(50),
    create_at TIMESTAMPTZ,
    update_user_id VARCHAR(50),
    update_at TIMESTAMPTZ,
    
    -- 主キー制約
    CONSTRAINT instruction_acknowledged_history_PKC PRIMARY KEY (
        organization_id,
        project_id,
        experiment_instruction_id,
        experiment_user_id
    )
);

-- インデックス作成（パフォーマンス最適化）
-- experiment_instruction_id検索用
CREATE INDEX idx_instruction_ack_history_instruction 
    ON instruction_acknowledged_history(experiment_instruction_id);

-- organization_id検索用（マルチテナント分離）
CREATE INDEX idx_instruction_ack_history_org 
    ON instruction_acknowledged_history(organization_id);

-- experiment_user_id検索用（ユーザー別確認履歴）
CREATE INDEX idx_instruction_ack_history_user 
    ON instruction_acknowledged_history(experiment_user_id);

-- project_id検索用
CREATE INDEX idx_instruction_ack_history_project 
    ON instruction_acknowledged_history(project_id);

-- テーブルコメント
COMMENT ON TABLE instruction_acknowledged_history IS '指示確認履歴テーブル - 実験指示の確認履歴を記録し監査証跡を提供';

-- カラムコメント
COMMENT ON COLUMN instruction_acknowledged_history.organization_id IS '組織ID - マルチテナント分離用（主キー1）';
COMMENT ON COLUMN instruction_acknowledged_history.project_id IS 'プロジェクトID - project.project_idへの外部キー（主キー2）';
COMMENT ON COLUMN instruction_acknowledged_history.experiment_instruction_id IS '実験指示ID - project_instruction.experiment_instruction_idへの外部キー（主キー3）';
COMMENT ON COLUMN instruction_acknowledged_history.experiment_user_id IS '実験作業者ID - 指示を確認したユーザー（主キー4）';
COMMENT ON COLUMN instruction_acknowledged_history.acknowledged_at IS '確認日時 - 指示が確認された日時';
COMMENT ON COLUMN instruction_acknowledged_history.create_user_id IS '作成者ユーザーID';
COMMENT ON COLUMN instruction_acknowledged_history.create_at IS 'レコード作成日時';
COMMENT ON COLUMN instruction_acknowledged_history.update_user_id IS '更新者ユーザーID';
COMMENT ON COLUMN instruction_acknowledged_history.update_at IS 'レコード更新日時';
