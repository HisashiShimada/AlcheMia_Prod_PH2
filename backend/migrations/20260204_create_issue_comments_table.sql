-- Migration: Create issue_comment table
-- Date: 2026-02-04
-- Purpose: 問題に対するコメント機能のためのテーブル作成
-- Requirements: REQ-001, REQ-005

-- issue_commentテーブルの作成
CREATE TABLE IF NOT EXISTS issue_comment (
    -- 主キー構成要素（マルチテナント分離 + 順序管理）
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    issue_id UUID NOT NULL,
    sequence_no INTEGER NOT NULL,
    
    -- コメント内容
    comment TEXT NOT NULL,
    
    -- 投稿者情報
    author_id UUID NOT NULL,
    commented_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 監査証跡
    create_user_id UUID NOT NULL,
    create_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_user_id UUID NOT NULL,
    update_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 主キー制約（組織ID + 問題ID + シーケンス番号）
    CONSTRAINT pk_issue_comment 
        PRIMARY KEY (organization_id, issue_id, sequence_no)
);

-- 外部キー制約（REQ-005）

-- 1. organization テーブルへの外部キー（ON DELETE CASCADE）
ALTER TABLE issue_comment
    ADD CONSTRAINT fk_issue_comment_organization
    FOREIGN KEY (organization_id)
    REFERENCES organization(organization_id)
    ON DELETE CASCADE;

-- 2. issues テーブルへの外部キー（ON DELETE CASCADE）
ALTER TABLE issue_comment
    ADD CONSTRAINT fk_issue_comment_issue
    FOREIGN KEY (organization_id, issue_id)
    REFERENCES issues(organization_id, id)
    ON DELETE CASCADE;

-- 3. organization_user テーブルへの外部キー（author_id、ON DELETE CASCADE）
ALTER TABLE issue_comment
    ADD CONSTRAINT fk_issue_comment_author
    FOREIGN KEY (organization_id, author_id)
    REFERENCES organization_user(organization_id, user_id)
    ON DELETE CASCADE;

-- チェック制約（REQ-002, REQ-008）

-- 1. sequence_no は 1 以上の正の整数であること
ALTER TABLE issue_comment
    ADD CONSTRAINT chk_issue_comment_sequence_no_positive
    CHECK (sequence_no > 0);

-- 2. comment の長さは 1〜2000 文字であること
ALTER TABLE issue_comment
    ADD CONSTRAINT chk_issue_comment_length
    CHECK (LENGTH(comment) >= 1 AND LENGTH(comment) <= 2000);

-- インデックス（REQ-008）

-- 1. 複合インデックス（organization_id, issue_id, sequence_no）
-- コメント取得クエリの最適化用
CREATE INDEX idx_issue_comment_org_issue_seq 
    ON issue_comment (organization_id, issue_id, sequence_no);

-- 2. 投稿者・日時インデックス（author_id, commented_at DESC）
-- ユーザー別のコメント履歴取得クエリの最適化用
CREATE INDEX idx_issue_comment_author_date 
    ON issue_comment (author_id, commented_at DESC);

-- コメント: テーブル作成の説明
COMMENT ON TABLE issue_comment IS '問題に対するコメントを管理するテーブル';
COMMENT ON COLUMN issue_comment.organization_id IS '組織ID（マルチテナント分離）';
COMMENT ON COLUMN issue_comment.project_id IS 'プロジェクトID（非正規化、パフォーマンス最適化）';
COMMENT ON COLUMN issue_comment.issue_id IS '問題ID';
COMMENT ON COLUMN issue_comment.sequence_no IS 'シーケンス番号（1から開始、連番）';
COMMENT ON COLUMN issue_comment.comment IS 'コメント内容（1-2000文字）';
COMMENT ON COLUMN issue_comment.author_id IS '投稿者のユーザーID';
COMMENT ON COLUMN issue_comment.commented_at IS 'コメント投稿日時';
COMMENT ON COLUMN issue_comment.create_user_id IS '作成者ID（監査証跡）';
COMMENT ON COLUMN issue_comment.create_at IS '作成日時（監査証跡）';
COMMENT ON COLUMN issue_comment.update_user_id IS '更新者ID（監査証跡）';
COMMENT ON COLUMN issue_comment.update_at IS '更新日時（監査証跡）';
