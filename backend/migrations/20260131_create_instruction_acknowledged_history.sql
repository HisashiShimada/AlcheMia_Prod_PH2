-- ===================================================================
-- Migration: Create instruction_acknowledged_history table
-- Date: 2026-01-31
-- Author: Development Team
-- Description: 指示確認履歴テーブルを作成し、実験指示の確認履歴を管理する
-- ===================================================================

-- マイグレーション実行（トランザクション制御）
BEGIN;

-- 既存テーブルが存在する場合は削除（冪等性を保証）
DROP TABLE IF EXISTS instruction_acknowledged_history CASCADE;

-- テーブル作成
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

-- マイグレーション完了
COMMIT;

-- ===================================================================
-- Rollback Instructions（ロールバック手順）
-- ===================================================================
-- このマイグレーションをロールバックするには、以下のSQLを実行してください：
--
-- BEGIN;
-- DROP TABLE IF EXISTS instruction_acknowledged_history CASCADE;
-- COMMIT;
--
-- 注意事項:
-- - ロールバックすると、instruction_acknowledged_historyテーブルと全データが削除されます
-- - 外部キー制約により関連テーブルへの影響はありません（CASCADE設定により安全に削除可能）
-- - 本番環境でのロールバックは慎重に実行してください
-- ===================================================================

-- ===================================================================
-- Error Handling（エラー処理）
-- ===================================================================
-- マイグレーション中にエラーが発生した場合：
-- 1. トランザクションは自動的にロールバックされます
-- 2. エラーメッセージを確認し、原因を特定してください
-- 3. 必要に応じてDDLファイルを修正し、再実行してください
-- 4. 外部キー制約エラーの場合、参照先テーブル（project_instruction, organization）の存在を確認してください
-- ===================================================================