-- ============================================================
-- file_metadata Phase 3 マイグレーション
-- ============================================================
-- 作成日: 2026-01-19
-- 目的: アップロード管理カラムの追加
-- 関連タスク: file-upload-dialog実装
-- ============================================================

-- Phase 3カラム追加
ALTER TABLE file_metadata
ADD COLUMN IF NOT EXISTS upload_batch_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS upload_source VARCHAR(50) DEFAULT 'web_upload'
  CHECK (upload_source IN ('web_upload', 'bulk_upload', 'folder_upload', 'api_upload')),
ADD COLUMN IF NOT EXISTS upload_method VARCHAR(50) DEFAULT 'single'
  CHECK (upload_method IN ('single', 'multipart', 'resumable')),
ADD COLUMN IF NOT EXISTS s3_storage_class VARCHAR(50) DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS s3_etag VARCHAR(100);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_file_metadata_upload_batch 
  ON file_metadata(upload_batch_id);

-- コメント追加
COMMENT ON COLUMN file_metadata.upload_batch_id IS '一括アップロード時のバッチID（UUID形式）';
COMMENT ON COLUMN file_metadata.upload_source IS 'アップロード元（web_upload, bulk_upload, folder_upload, api_upload）';
COMMENT ON COLUMN file_metadata.upload_method IS 'アップロード方法（single, multipart, resumable）';
COMMENT ON COLUMN file_metadata.s3_storage_class IS 'S3ストレージクラス';
COMMENT ON COLUMN file_metadata.s3_etag IS 'S3 ETag（整合性チェック用）';
