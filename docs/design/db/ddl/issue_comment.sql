-- ===================================================================
-- テーブル名: issue_comment (問題コメント)
-- 説明: 問題に対するコメントを管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS issue_comment CASCADE;

CREATE TABLE issue_comment (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id UUID NOT NULL,
    issue_id CHARACTER VARYING NOT NULL,
    sequence_no NUMERIC(3,0) NOT NULL,
    
    -- コメント情報
    comment CHARACTER VARYING,
    author_id UUID,
    commented_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT issue_comment_pkey PRIMARY KEY (organization_id, project_id, issue_id, sequence_no)
);

-- コメント
COMMENT ON TABLE issue_comment IS '問題コメント';
COMMENT ON COLUMN issue_comment.organization_id IS '組織ID';
COMMENT ON COLUMN issue_comment.project_id IS 'プロジェクトID';
COMMENT ON COLUMN issue_comment.issue_id IS '問題ID';
COMMENT ON COLUMN issue_comment.sequence_no IS 'シーケンス番号';
COMMENT ON COLUMN issue_comment.comment IS 'コメント';
COMMENT ON COLUMN issue_comment.author_id IS '記入者ID';
COMMENT ON COLUMN issue_comment.commented_at IS '記入日時';
