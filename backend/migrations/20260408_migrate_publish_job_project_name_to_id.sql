-- ============================================================
-- maiml_publish_job テーブルの project_name カラムを project_id に変更
-- ============================================================
-- 実行日: 2026-04-08
-- 理由: APIルートが :projectName から :projectId に変更されたため
-- ============================================================

-- project_name カラムを project_id にリネーム
ALTER TABLE maiml_publish_job
  RENAME COLUMN project_name TO project_id;

-- 既存インデックスを削除して再作成
DROP INDEX IF EXISTS ix_publish_job_org_project;

CREATE INDEX IF NOT EXISTS ix_publish_job_org_project
  ON maiml_publish_job(organization_id, project_id);

COMMENT ON COLUMN maiml_publish_job.project_id IS '対象プロジェクト ID（project.project_id）';
