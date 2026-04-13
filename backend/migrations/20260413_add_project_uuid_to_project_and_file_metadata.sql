-- ============================================================
-- project・file_metadata テーブルに project_uuid カラムを追加
-- ============================================================
-- 実行日: 2026-04-13
-- 理由: プロジェクトUUID（MAIMLファイルの<Document uuid>）を
--       project および file_metadata テーブルで管理するため
-- 参照: docs/改善仕様調査/No.2/PLAN.md
-- ============================================================

-- project テーブルに project_uuid カラムを追加
ALTER TABLE project
  ADD COLUMN IF NOT EXISTS project_uuid UUID;

COMMENT ON COLUMN project.project_uuid IS 'プロジェクトUUID: MAIMLファイルの<Document uuid>と同値。プロジェクト名変更時もこのUUIDは不変';

-- file_metadata テーブルに project_uuid カラムを追加
ALTER TABLE file_metadata
  ADD COLUMN IF NOT EXISTS project_uuid UUID;

COMMENT ON COLUMN file_metadata.project_uuid IS 'プロジェクトUUID（project.project_uuidと同値）。MAIMLファイルの<Document uuid>と同値。プロジェクト名変更時もこのUUIDは不変';
