-- ===================================================================
-- テーブル名: instruction_acknowledged_history (指示確認履歴)
-- 説明: 実験指示の確認履歴を管理するテーブル（監査証跡）
-- バージョン: 2.0 (2026-01-31)
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS instruction_acknowledged_history CASCADE;

CREATE TABLE instruction_acknowledged_history (
    -- 主キー
    history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 指示情報
    instruction_id UUID NOT NULL,
    
    -- 確認情報
    acknowledged_user_id UUID NOT NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- マルチテナント分離
    organization_id UUID NOT NULL,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 外部キー制約
    CONSTRAINT fk_instruction 
        FOREIGN KEY (instruction_id) 
        REFERENCES project_instruction(instruction_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_organization 
        FOREIGN KEY (organization_id) 
        REFERENCES organization(organization_id) 
        ON DELETE CASCADE
);

-- インデックス作成（パフォーマンス最適化）
-- instruction_id検索用
CREATE INDEX idx_instruction_ack_history_instruction 
    ON instruction_acknowledged_history(instruction_id);

-- organization_id検索用（マルチテナント分離）
CREATE INDEX idx_instruction_ack_history_org 
    ON instruction_acknowledged_history(organization_id);

-- acknowledged_user_id検索用（ユーザー別確認履歴）
CREATE INDEX idx_instruction_ack_history_user 
    ON instruction_acknowledged_history(acknowledged_user_id);

-- テーブルコメント
COMMENT ON TABLE instruction_acknowledged_history IS '指示確認履歴テーブル - 実験指示の確認履歴を記録し監査証跡を提供';

-- カラムコメント
COMMENT ON COLUMN instruction_acknowledged_history.history_id IS '履歴ID（UUID、自動生成）';
COMMENT ON COLUMN instruction_acknowledged_history.instruction_id IS '指示ID - project_instruction.instruction_idへの外部キー';
COMMENT ON COLUMN instruction_acknowledged_history.acknowledged_user_id IS '確認ユーザーID - 指示を確認したユーザー';
COMMENT ON COLUMN instruction_acknowledged_history.acknowledged_at IS '確認日時 - 指示が確認された日時（UTC）';
COMMENT ON COLUMN instruction_acknowledged_history.organization_id IS '組織ID - マルチテナント分離用';
COMMENT ON COLUMN instruction_acknowledged_history.created_at IS 'レコード作成日時';