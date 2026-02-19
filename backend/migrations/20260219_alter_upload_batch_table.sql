-- ============================================
-- Migration: upload_batchテーブル構造変更
-- Date: 2026-02-19
-- Phase: Phase 2-1 (Reference版準拠への変更)
-- Description: upload_batchテーブルをReference版の構造に変更
-- ============================================

-- Step 1: 既存のfile_metadataの外部キー制約を削除
ALTER TABLE file_metadata
DROP CONSTRAINT IF EXISTS fk_file_metadata_batch;

-- Step 2: 既存のインデックスを削除
DROP INDEX IF EXISTS idx_upload_batch_uploaded_by;
DROP INDEX IF EXISTS idx_upload_batch_created_at;
DROP INDEX IF EXISTS idx_upload_batch_batch_id;

-- Step 3: テーブルをバックアップ（オプション）
-- CREATE TABLE upload_batch_backup AS SELECT * FROM upload_batch;

-- Step 4: 既存テーブルを削除
DROP TABLE IF EXISTS upload_batch CASCADE;

-- Step 5: 新しいテーブル構造で再作成
CREATE TABLE upload_batch (
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

-- Step 6: インデックス作成
CREATE INDEX idx_upload_batch_organization ON upload_batch(organization_id);
CREATE INDEX idx_upload_batch_upload_by ON upload_batch(upload_by);
CREATE INDEX idx_upload_batch_status ON upload_batch(status);
CREATE INDEX idx_upload_batch_create_at ON upload_batch(create_at DESC);

-- Step 8: file_metadataのupload_batch_idカラムにインデックス再作成
CREATE INDEX IF NOT EXISTS idx_file_metadata_batch_id ON file_metadata(upload_batch_id);

-- Step 9: コメント追加
COMMENT ON TABLE upload_batch IS 'アップロードバッチ管理テーブル（Phase 2-1、Reference版準拠）';
COMMENT ON COLUMN upload_batch.batch_id IS 'バッチ識別子（batch_YYYYMMDD_HHMMSS_random）主キー';
COMMENT ON COLUMN upload_batch.upload_type IS 'アップロード種別（single/bulk/folder/draft）';
COMMENT ON COLUMN upload_batch.upload_by IS 'アップロード実行者（user_idまたはユーザー名）';
COMMENT ON COLUMN upload_batch.status IS 'バッチステータス（in_progress/completed/completed_with_errors/failed）';
COMMENT ON COLUMN upload_batch.create_at IS 'レコード作成日時';
COMMENT ON COLUMN upload_batch.update_at IS 'レコード更新日時';

-- ============================================
-- Migration Complete
-- Note: 既存データは削除されます。
-- 必要に応じてバックアップから復元してください。
-- ============================================
