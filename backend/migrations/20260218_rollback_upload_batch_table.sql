-- ============================================
-- Rollback: upload_batchテーブル削除
-- Date: 2026-02-18
-- Phase: Phase 2-1 (バッチ管理機能)
-- Description: upload_batch関連の変更をロールバック
-- ============================================

-- 警告: このスクリプトは既存のバッチデータを削除します
-- 実行前に必ずバックアップを取得してください

BEGIN;

-- Step 1: file_metadataの外部キー制約削除
ALTER TABLE file_metadata
DROP CONSTRAINT IF EXISTS fk_file_metadata_batch;

-- Step 2: file_metadataのインデックス削除
DROP INDEX IF EXISTS idx_file_metadata_batch_id;

-- Step 3: file_metadataのupload_batch_idカラム削除
ALTER TABLE file_metadata
DROP COLUMN IF EXISTS upload_batch_id;

-- Step 4: upload_batchテーブルのインデックス削除
DROP INDEX IF EXISTS idx_upload_batch_batch_id;
DROP INDEX IF EXISTS idx_upload_batch_created_at;
DROP INDEX IF EXISTS idx_upload_batch_status;
DROP INDEX IF EXISTS idx_upload_batch_uploaded_by;
DROP INDEX IF EXISTS idx_upload_batch_organization;

-- Step 5: upload_batchテーブル削除
DROP TABLE IF EXISTS upload_batch CASCADE;

COMMIT;

-- ============================================
-- Rollback Complete: upload_batch table removed
-- ============================================

-- 確認クエリ（ロールバック後に実行）:
-- SELECT EXISTS (
--   SELECT FROM information_schema.tables 
--   WHERE table_schema = 'public' 
--   AND table_name = 'upload_batch'
-- );
-- 結果がfalseであればロールバック成功
