-- ============================================================
-- Migration: MAIML検索用メタデータカラムの削除
-- Date: 2026-03-05
-- Description: プロジェクト管理画面の詳細検索機能削除に伴い、
--              file_metadataテーブルのMAIML検索用カラムを削除する
-- ============================================================

ALTER TABLE file_metadata
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
  DROP COLUMN IF EXISTS maiml_metadata_extraction_status;
