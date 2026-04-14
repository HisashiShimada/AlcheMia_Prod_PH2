-- ============================================================
-- マイグレーション: project_uuid にユニーク制約を追加
-- ============================================================
-- 作成日: 2026-04-14
-- 対象テーブル: project, file_metadata
-- 目的: project_uuid カラムに重複値が入らないようユニーク制約を付与する
-- ============================================================

-- ============================================================
-- 1. project テーブル: project_uuid にユニーク制約を追加
-- ============================================================

ALTER TABLE project
  ADD CONSTRAINT uk_project_project_uuid UNIQUE (project_uuid);

-- ============================================================
-- 2. file_metadata テーブル: project_uuid にユニーク制約を追加
-- ============================================================

ALTER TABLE file_metadata
  ADD CONSTRAINT uk_file_metadata_project_uuid UNIQUE (project_uuid);

-- ============================================================
-- ロールバック用 (必要な場合は以下を実行)
-- ============================================================

-- ALTER TABLE project DROP CONSTRAINT IF EXISTS uk_project_project_uuid;
-- ALTER TABLE file_metadata DROP CONSTRAINT IF EXISTS uk_file_metadata_project_uuid;
