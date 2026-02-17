-- ===================================================================
-- Migration: Create template_data table for experiment data save feature
-- Date: 2026-02-17
-- Author: Development Team
-- Description: 実験データ（Material、Condition、Result）を一括保存するためのtemplate_dataテーブルを作成
-- ===================================================================

-- マイグレーション実行（トランザクション制御）
BEGIN;

-- 既存テーブルが存在する場合は削除（冪等性を保証）
DROP TABLE IF EXISTS template_data CASCADE;

-- Create template_data table
CREATE TABLE template_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(255) NOT NULL,
    project_id UUID NOT NULL,
    method_id VARCHAR(255) NOT NULL,
    task_no INTEGER NOT NULL,
    place_id VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    template_id VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    status VARCHAR(50),
    comment TEXT,
    recorded_by UUID NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint (UPSERT key)
    CONSTRAINT template_data_unique_key 
        UNIQUE (organization_id, project_id, method_id, task_no, place_id),
    
    -- Foreign key constraints
    CONSTRAINT fk_template_data_project 
        FOREIGN KEY (organization_id, project_id) 
        REFERENCES project(organization_id, project_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_template_data_project_task 
        FOREIGN KEY (organization_id, project_id, method_id, task_no) 
        REFERENCES project_task(organization_id, project_id, method_id, task_no) 
        ON DELETE CASCADE,
    
    -- Check constraint for template_type
    CONSTRAINT chk_template_data_template_type 
        CHECK (template_type IN ('material', 'condition', 'result')),
    
    -- Check constraint for status
    CONSTRAINT chk_template_data_status 
        CHECK (status IN ('initial', 'preparing', 'ready', 'running', 'paused', 'completed', 'error'))
);

-- Create indexes for performance optimization

-- Composite index for organization and recorded_at filtering (time-series queries)
CREATE INDEX idx_template_data_org_recorded 
    ON template_data(organization_id, recorded_at);

-- Composite index for project and task filtering (most common query pattern)
CREATE INDEX idx_template_data_project_task 
    ON template_data(project_id, task_no);

-- GIN index for JSONB data column (enables fast JSON queries)
CREATE INDEX idx_template_data_data_gin 
    ON template_data USING GIN (data);

-- Create trigger for updated_at automatic update
CREATE OR REPLACE FUNCTION update_template_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_template_data_updated_at
    BEFORE UPDATE ON template_data
    FOR EACH ROW
    EXECUTE FUNCTION update_template_data_updated_at();

-- Add comments for documentation
COMMENT ON TABLE template_data IS '実験データテーブル - Material、Condition、Resultデータを一括保存';
COMMENT ON COLUMN template_data.id IS 'レコードID（主キー）';
COMMENT ON COLUMN template_data.organization_id IS '組織ID（マルチテナント分離用）';
COMMENT ON COLUMN template_data.project_id IS 'プロジェクトID';
COMMENT ON COLUMN template_data.method_id IS 'メソッドID';
COMMENT ON COLUMN template_data.task_no IS 'タスク番号（1以上の整数）';
COMMENT ON COLUMN template_data.place_id IS 'プレースID（Petri Netのプレース識別子）';
COMMENT ON COLUMN template_data.template_type IS 'テンプレートタイプ（material, condition, result）';
COMMENT ON COLUMN template_data.template_id IS 'テンプレートID';
COMMENT ON COLUMN template_data.data IS 'データ（JSONB形式）';
COMMENT ON COLUMN template_data.status IS 'ステータス（initial, preparing, ready, running, paused, completed, error）';
COMMENT ON COLUMN template_data.comment IS 'コメント（最大2000文字、オプショナル）';
COMMENT ON COLUMN template_data.recorded_by IS '記録者のユーザーID';
COMMENT ON COLUMN template_data.recorded_at IS '記録日時';
COMMENT ON COLUMN template_data.created_at IS '作成日時';
COMMENT ON COLUMN template_data.updated_at IS '更新日時（自動更新）';

-- マイグレーション完了
COMMIT;

-- ===================================================================
-- Rollback Instructions（ロールバック手順）
-- ===================================================================
-- このマイグレーションをロールバックするには、以下のSQLを実行してください：
--
-- BEGIN;
-- DROP TABLE IF EXISTS template_data CASCADE;
-- COMMIT;
--
-- 注意事項:
-- - ロールバックすると、template_dataテーブルと全データが削除されます
-- - 本番環境でのロールバックは慎重に実行してください
-- ===================================================================

-- ===================================================================
-- Error Handling（エラー処理）
-- ===================================================================
-- マイグレーション中にエラーが発生した場合：
-- 1. トランザクションは自動的にロールバックされます
-- 2. エラーメッセージを確認し、原因を特定してください
-- 3. 必要に応じてDDLファイルを修正し、再実行してください
-- ===================================================================

-- ===================================================================
-- Notes（注意事項）
-- ===================================================================
-- 1. 外部キー制約
--    - projectテーブルへの参照: CASCADE削除（プロジェクト削除時にデータも削除）
--    - project_taskテーブルへの参照: CASCADE削除（タスク削除時にデータも削除）
--    - マルチテナント分離を保証（organization_idを含む複合キー）
--
-- 2. UPSERT操作のための一意キー制約
--    - (organization_id, project_id, method_id, task_no, place_id)
--    - ON CONFLICT ... DO UPDATE構文で使用
--
-- 3. GINインデックス
--    - JSONB型のdata列に対して高速検索を実現
--    - WHERE data @> '{"key": "value"}' クエリで使用
--
-- 4. マルチテナント分離
--    - すべてのクエリでorganization_idフィルタを必須とする
--    - アプリケーション層でtenantIsolationミドルウェアを使用
-- ===================================================================
