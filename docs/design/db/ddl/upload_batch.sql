-- ============================================
-- Table: upload_batch
-- Description: アップロードバッチ管理テーブル
-- Phase: Phase 2-1 (バッチ管理機能)
-- Version: 2.0 (Reference版に準拠)
-- ============================================

CREATE TABLE IF NOT EXISTS upload_batch (
  -- 主キー（batch_idを主キーとして使用）
  batch_id VARCHAR(100) PRIMARY KEY,
  
  -- バッチ情報
  batch_name VARCHAR(255) NOT NULL,
  upload_type VARCHAR(50) NOT NULL,  -- 'single', 'bulk', 'folder', 'draft'
  
  -- 組織
  organization_id UUID NOT NULL,
  
  -- アップロード実行者（VARCHAR(50)に変更）
  upload_by VARCHAR(50) NOT NULL,
  
  -- 進捗情報
  total_files INTEGER NOT NULL,
  completed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  
  -- ステータス
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
  -- 'in_progress', 'completed', 'completed_with_errors', 'failed'
  
  -- タイムスタンプ（カラム名を変更）
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  create_at TIMESTAMP NOT NULL DEFAULT NOW(),
  update_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- 制約条件
  CONSTRAINT check_completed_files CHECK (completed_files >= 0),
  CONSTRAINT check_failed_files CHECK (failed_files >= 0),
  CONSTRAINT check_total_files CHECK (total_files > 0),
  CONSTRAINT check_progress CHECK (completed_files + failed_files <= total_files)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_upload_batch_organization ON upload_batch(organization_id);
CREATE INDEX IF NOT EXISTS idx_upload_batch_upload_by ON upload_batch(upload_by);
CREATE INDEX IF NOT EXISTS idx_upload_batch_status ON upload_batch(status);
CREATE INDEX IF NOT EXISTS idx_upload_batch_create_at ON upload_batch(create_at DESC);

-- コメント追加
COMMENT ON TABLE upload_batch IS 'アップロードバッチ管理テーブル（Phase 2-1、Reference版準拠）';
COMMENT ON COLUMN upload_batch.batch_id IS 'バッチ識別子（batch_YYYYMMDD_HHMMSS_random）主キー';
COMMENT ON COLUMN upload_batch.upload_type IS 'アップロード種別（single/bulk/folder/draft）';
COMMENT ON COLUMN upload_batch.upload_by IS 'アップロード実行者（user_idまたはユーザー名）';
COMMENT ON COLUMN upload_batch.status IS 'バッチステータス（in_progress/completed/completed_with_errors/failed）';
COMMENT ON COLUMN upload_batch.create_at IS 'レコード作成日時';
COMMENT ON COLUMN upload_batch.update_at IS 'レコード更新日時';

-- ============================================
-- Migration Note:
-- 既存のupload_batchテーブルがある場合は、
-- backend/migrations/20260219_alter_upload_batch_table.sql
-- を実行してテーブル構造を変更してください。
-- ============================================
