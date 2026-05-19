-- ============================================================
-- file_metadata テーブル 不要カラム削除
-- ============================================================
-- 作成日: 2026-05-19
-- 対応タスク: docs/20260518_1632_file_metadata不要カラム削除/PLAN.md
-- 
-- 削除理由:
--   コード全体を調査した結果、以下のカラムはいずれも
--   本番コード（backend/src）・テストコード（backend/tests）から
--   値が設定・参照されていないことを確認済み。
--
-- ※ backend/scripts/ の rematch-maiml-metadata.ts / test-search-query.ts は
--    maiml_document_uuid 〜 maiml_metadata_extraction_status を参照しているが、
--    本番フローでは不使用のバックフィル/テスト用スクリプトのため削除対象とする。
-- ============================================================

BEGIN;

-- ============================================================
-- Step 1: インデックス削除（カラム削除前に先に削除）
-- ============================================================

-- Phase 2: custom_metadata / tags / search_keywords 用インデックス
DROP INDEX IF EXISTS idx_file_metadata_custom_metadata_gin;
DROP INDEX IF EXISTS idx_file_metadata_tags_gin;
DROP INDEX IF EXISTS idx_file_metadata_search_keywords_gin;

-- Phase 2.5: maiml_document_uuid 〜 maiml_metadata_extraction_status 用インデックス
DROP INDEX IF EXISTS idx_file_metadata_maiml_doc_uuid;
DROP INDEX IF EXISTS idx_file_metadata_maiml_doc_name;
DROP INDEX IF EXISTS idx_file_metadata_maiml_measurement_values_gin;
DROP INDEX IF EXISTS idx_file_metadata_maiml_units_gin;
DROP INDEX IF EXISTS idx_file_metadata_maiml_section_types_gin;
DROP INDEX IF EXISTS idx_file_metadata_maiml_ids_gin;
DROP INDEX IF EXISTS idx_file_metadata_maiml_refs_gin;
DROP INDEX IF EXISTS idx_file_metadata_maiml_keys_gin;
DROP INDEX IF EXISTS idx_file_metadata_maiml_elements_gin;
DROP INDEX IF EXISTS idx_file_metadata_maiml_values_gin;
DROP INDEX IF EXISTS idx_file_metadata_maiml_extraction_status;

-- ============================================================
-- Step 2: カラム削除
-- ============================================================

ALTER TABLE file_metadata
  -- Phase 2系: 詳細検索機能カラム（値を設定するコードなし）
  DROP COLUMN IF EXISTS custom_metadata,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS search_keywords,
  DROP COLUMN IF EXISTS description,

  -- Phase 2.5系: MAIMLメタデータ抽出カラム（maimlMetadataExtractor がfile_metadataに書き込まない）
  DROP COLUMN IF EXISTS maiml_document_uuid,
  DROP COLUMN IF EXISTS maiml_document_name,
  DROP COLUMN IF EXISTS maiml_document_description,
  DROP COLUMN IF EXISTS maiml_measurement_values,
  DROP COLUMN IF EXISTS maiml_units,
  DROP COLUMN IF EXISTS maiml_section_types,
  DROP COLUMN IF EXISTS maiml_ids,
  DROP COLUMN IF EXISTS maiml_refs,
  DROP COLUMN IF EXISTS maiml_keys,
  DROP COLUMN IF EXISTS maiml_elements,
  DROP COLUMN IF EXISTS maiml_values,
  DROP COLUMN IF EXISTS maiml_metadata_extracted_at,
  DROP COLUMN IF EXISTS maiml_metadata_extraction_status,

  -- Phase 3系: S3管理カラム（DEFAULT値のみ / 設定・参照コードなし）
  DROP COLUMN IF EXISTS s3_etag,
  DROP COLUMN IF EXISTS s3_storage_class,

  -- その他: 設定・参照コードなし
  DROP COLUMN IF EXISTS maiml_validation_result,
  DROP COLUMN IF EXISTS last_edit_timestamp;

COMMIT;
