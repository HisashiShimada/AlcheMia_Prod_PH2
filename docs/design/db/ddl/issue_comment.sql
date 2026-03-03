-- ===================================================================
-- テーブル名: issue_comment (問題コメント)
-- 説明: 問題に対するコメントを管理するテーブル
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS issue_comment CASCADE;

CREATE TABLE issue_comment (
    -- 複合主キー
    organization_id UUID NOT NULL,
    project_id character varying(20) NOT NULL,
    issue_id CHARACTER VARYING NOT NULL,
    sequence_no NUMERIC(3,0) NOT NULL,
    
    -- コメント情報
    comment CHARACTER VARYING,
    author_id VARCHAR(50),
    commented_at TIMESTAMP,
    
    -- 監査証跡
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    
    -- タイムスタンプ
    create_at TIMESTAMP,
    update_at TIMESTAMP,
    
    -- 制約
    CONSTRAINT issue_comment_pkey PRIMARY KEY (organization_id, project_id, issue_id, sequence_no)
);

-- インデックス（パフォーマンス最適化）
-- 問題IDによるコメント取得用インデックス
CREATE INDEX idx_issue_comment_issue_id
    ON issue_comment (issue_id, sequence_no);

-- 組織・問題IDによる複合インデックス（マルチテナント分離 + コメント取得）
CREATE INDEX idx_issue_comment_org_issue
    ON issue_comment (organization_id, issue_id);

-- コメント
COMMENT ON TABLE issue_comment IS '問題コメント';
COMMENT ON COLUMN issue_comment.organization_id IS '組織ID';
COMMENT ON COLUMN issue_comment.project_id IS 'プロジェクトID';
COMMENT ON COLUMN issue_comment.issue_id IS '問題ID';
COMMENT ON COLUMN issue_comment.sequence_no IS 'シーケンス番号';
COMMENT ON COLUMN issue_comment.comment IS 'コメント';
COMMENT ON COLUMN issue_comment.author_id IS '記入者ID';
COMMENT ON COLUMN issue_comment.commented_at IS '記入日時';
COMMENT ON COLUMN issue_comment.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN issue_comment.update_user_id IS '更新者ユーザID';
COMMENT ON COLUMN issue_comment.create_at IS '作成日時';
COMMENT ON COLUMN issue_comment.update_at IS '更新日時';
