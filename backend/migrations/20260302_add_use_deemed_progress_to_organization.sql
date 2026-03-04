-- Migration: organizationテーブルにみなし進捗使用フラグを追加
-- Date: 2026-03-02
-- Description: 組織ごとにみなし進捗機能を使用するかどうかを切り替えるためのフラグカラムを追加する

ALTER TABLE organization
  ADD COLUMN IF NOT EXISTS use_deemed_progress BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN organization.use_deemed_progress IS 'みなし進捗使用フラグ';
