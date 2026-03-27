-- maiml_draftsテーブルにproject_idカラムを追加
-- 目的: Draft初期表示時にどのプロジェクトのDraftかを特定するため

ALTER TABLE maiml_drafts
ADD COLUMN IF NOT EXISTS project_id VARCHAR(255);

-- project_idへのインデックスを追加
CREATE INDEX IF NOT EXISTS idx_maiml_drafts_project_id ON maiml_drafts(project_id);
CREATE INDEX IF NOT EXISTS idx_maiml_drafts_org_project ON maiml_drafts(organization_id, project_id);

-- DDLファイル更新用コメント
-- docs/design/db/ddl/maiml_drafts.sql の project_id カラムも追加が必要

COMMENT ON COLUMN maiml_drafts.project_id IS 'プロジェクトID（プロジェクト管理画面からのDraft特定用）';
