-- ===================================================================
-- Migration: Create issues table for issue reporting feature
-- Date: 2026-02-04
-- Author: Development Team
-- Description: 実験中に発生した問題を記録・管理するためのissuesテーブルを作成
-- ===================================================================

-- マイグレーション実行（トランザクション制御）
BEGIN;

-- 既存テーブルが存在する場合は削除（冪等性を保証）
DROP TABLE IF EXISTS issues CASCADE;

-- Create issues table
CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    task_detail_id UUID,
    reporter_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    issue_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    assignee_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_issues_organization 
        FOREIGN KEY (organization_id) 
        REFERENCES organization(organization_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_issues_project 
        FOREIGN KEY (project_id) 
        REFERENCES project(project_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_issues_task_detail 
        FOREIGN KEY (task_detail_id) 
        REFERENCES project_task_detail(task_detail_id) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_issues_reporter 
        FOREIGN KEY (reporter_id) 
        REFERENCES organization_user(organization_user_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_issues_assignee 
        FOREIGN KEY (assignee_id) 
        REFERENCES organization_user(organization_user_id) 
        ON DELETE SET NULL,
    
    -- Check constraints for enum-like values
    CONSTRAINT chk_issues_issue_type 
        CHECK (issue_type IN ('bug', 'feature_request', 'question', 'improvement', 'other')),
    
    CONSTRAINT chk_issues_severity 
        CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    
    CONSTRAINT chk_issues_status 
        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'rejected'))
);

-- Create indexes for performance optimization

-- Composite index for organization and project filtering (most common query pattern)
CREATE INDEX idx_issues_organization_id_project_id 
    ON issues(organization_id, project_id);

-- Index for reporter queries
CREATE INDEX idx_issues_reporter_id 
    ON issues(reporter_id);

-- Index for status filtering
CREATE INDEX idx_issues_status 
    ON issues(status);

-- Index for created_at sorting and filtering
CREATE INDEX idx_issues_created_at 
    ON issues(created_at DESC);

-- Index for assignee filtering
CREATE INDEX idx_issues_assignee_id 
    ON issues(assignee_id) 
    WHERE assignee_id IS NOT NULL;

-- Index for task_detail_id queries
CREATE INDEX idx_issues_task_detail_id 
    ON issues(task_detail_id) 
    WHERE task_detail_id IS NOT NULL;

-- Create trigger for updated_at automatic update
CREATE OR REPLACE FUNCTION update_issues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_issues_updated_at
    BEFORE UPDATE ON issues
    FOR EACH ROW
    EXECUTE FUNCTION update_issues_updated_at();

-- Add comments for documentation
COMMENT ON TABLE issues IS '問題報告テーブル - 実験中に発生した問題を記録・管理';
COMMENT ON COLUMN issues.id IS '問題ID（主キー）';
COMMENT ON COLUMN issues.organization_id IS '組織ID（マルチテナント分離用）';
COMMENT ON COLUMN issues.project_id IS 'プロジェクトID';
COMMENT ON COLUMN issues.task_detail_id IS 'タスク詳細ID（オプショナル）';
COMMENT ON COLUMN issues.reporter_id IS '報告者のユーザーID';
COMMENT ON COLUMN issues.title IS '問題のタイトル（最大200文字）';
COMMENT ON COLUMN issues.description IS '問題の詳細説明';
COMMENT ON COLUMN issues.issue_type IS '問題タイプ（bug, feature_request, question, improvement, other）';
COMMENT ON COLUMN issues.severity IS '重要度（critical, high, medium, low）';
COMMENT ON COLUMN issues.status IS 'ステータス（open, in_progress, resolved, closed, rejected）';
COMMENT ON COLUMN issues.assignee_id IS '担当者のユーザーID（オプショナル）';
COMMENT ON COLUMN issues.created_at IS '作成日時';
COMMENT ON COLUMN issues.updated_at IS '更新日時（自動更新）';

-- マイグレーション完了
COMMIT;

-- ===================================================================
-- Rollback Instructions（ロールバック手順）
-- ===================================================================
-- このマイグレーションをロールバックするには、以下のSQLを実行してください：
--
-- BEGIN;
-- DROP TABLE IF EXISTS issues CASCADE;
-- COMMIT;
--
-- 注意事項:
-- - ロールバックすると、issuesテーブルと全データが削除されます
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
-- 4. 外部キー制約エラーの場合、参照先テーブルの存在を確認してください
--    - organization, project, project_task_detail, organization_user
-- ===================================================================
