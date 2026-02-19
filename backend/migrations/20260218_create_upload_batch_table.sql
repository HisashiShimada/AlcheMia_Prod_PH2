-- ============================================
-- Migration: upload_batchテーブル作成
-- Date: 2026-02-18
-- Phase: Phase 2-1 (バッチ管理機能)
-- Description: アップロードバッチ管理テーブルの作成
-- ============================================

-- Step 1: upload_batchテーブル作成
CREATE TABLE IF NOT EXISTS upload_batch (
  -- 主キー
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- バッチ識別子
  batch_id VARCHAR(100) UNIQUE NOT NULL,
  
  -- バッチ情報
  batch_name VARCHAR(255) NOT NULL,
  upload_type VARCHAR(50) NOT NULL,  -- 'single', 'bulk', 'folder', 'draft'
  
  -- 組織・ユーザー
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 進捗情報
  total_files INTEGER NOT NULL,
  completed_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  
  -- ステータス
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
  -- 'in_progress', 'completed', 'completed_with_errors', 'failed'
  
  -- タイムスタンプ
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- 制約条件
  CONSTRAINT check_completed_files CHECK (completed_files >= 0),
  CONSTRAINT check_failed_files CHECK (failed_files >= 0),
  CONSTRAINT check_total_files CHECK (total_files > 0),
  CONSTRAINT check_progress CHECK (completed_files + failed_files <= total_files)
);

-- Step 2: インデックス作成
CREATE INDEX IF NOT EXISTS idx_upload_batch_organization ON upload_batch(organization_id);
CREATE INDEX IF NOT EXISTS idx_upload_batch_uploaded_by ON upload_batch(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_upload_batch_status ON upload_batch(status);
CREATE INDEX IF NOT EXISTS idx_upload_batch_created_at ON upload_batch(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_batch_batch_id ON upload_batch(batch_id);

-- Step 3: file_metadataテーブルにupload_batch_idカラム追加
ALTER TABLE file_metadata 
ADD COLUMN IF NOT EXISTS upload_batch_id VARCHAR(100);

-- Step 4: file_metadataの外部キー制約追加（既存データに影響しないようNULL許可）
ALTER TABLE file_metadata
ADD CONSTRAINT fk_file_metadata_batch
FOREIGN KEY (upload_batch_id) 
REFERENCES upload_batch(batch_id) 
ON DELETE SET NULL;

-- Step 5: file_metadataのupload_batch_idカラムにインデックス追加
CREATE INDEX IF NOT EXISTS idx_file_metadata_batch_id ON file_metadata(upload_batch_id);

-- Step 6: コメント追加
COMMENT ON TABLE upload_batch IS 'アップロードバッチ管理テーブル（Phase 2-1）';
COMMENT ON COLUMN upload_batch.batch_id IS 'バッチ識別子（batch_YYYYMMDD_HHMMSS_random）';
COMMENT ON COLUMN upload_batch.upload_type IS 'アップロード種別（single/bulk/folder/draft）';
COMMENT ON COLUMN upload_batch.status IS 'バッチステータス（in_progress/completed/completed_with_errors/failed）';
COMMENT ON COLUMN file_metadata.upload_batch_id IS 'アップロードバッチID（upload_batch.batch_idへの参照）';

-- マイグレーション完了
-- ============================================
-- Migration Complete: upload_batch table created
-- ============================================
