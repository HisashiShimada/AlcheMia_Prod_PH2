-- ============================================================
-- file_metadata テーブルに MAIML検索用メタデータカラム追加
-- ============================================================
-- 作成日: 2026-02-20
-- 目的: backend/reference/services/maimlMetadataExtractor.js で使用される
--       MAIML検索用メタデータカラムを追加
-- 
-- 対応する仕様: docs/design/db/ddl/file_metadata.sql (Phase 2.5)
-- 参照元: backend/reference/sql/add-maiml-search-metadata-columns.sql
-- 
-- 【追加カラム: 13カラム】
-- ■ MAIML Document情報 (3カラム)
--   - maiml_document_uuid, maiml_document_name, maiml_document_description
-- 
-- ■ MAIML測定データ情報 (2カラム)
--   - maiml_measurement_values, maiml_units
-- 
-- ■ MAIML構造情報 (1カラム)
--   - maiml_section_types
-- 
-- ■ MAIML属性情報 (5カラム)
--   - maiml_ids, maiml_refs, maiml_keys, maiml_elements, maiml_values
-- 
-- ■ メタデータ抽出状態 (2カラム)
--   - maiml_metadata_extracted_at, maiml_metadata_extraction_status
-- ============================================================

-- ============================================================
-- カラム追加
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 [Migration] file_metadataテーブルにMAIML検索用メタデータカラムを追加開始...';
END $$;

-- MAIML Document情報カラム追加
ALTER TABLE file_metadata 
ADD COLUMN IF NOT EXISTS maiml_document_uuid VARCHAR(255),
ADD COLUMN IF NOT EXISTS maiml_document_name TEXT,
ADD COLUMN IF NOT EXISTS maiml_document_description TEXT;

-- MAIML測定データ情報（JSONB配列で複数値対応）
ALTER TABLE file_metadata 
ADD COLUMN IF NOT EXISTS maiml_measurement_values JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS maiml_units JSONB DEFAULT '[]'::jsonb;

-- MAIML構造情報（JSONB配列で複数値対応）
ALTER TABLE file_metadata 
ADD COLUMN IF NOT EXISTS maiml_section_types JSONB DEFAULT '[]'::jsonb;

-- MAIML属性情報（JSONB配列で複数値対応）
ALTER TABLE file_metadata 
ADD COLUMN IF NOT EXISTS maiml_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS maiml_refs JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS maiml_keys JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS maiml_elements JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS maiml_values JSONB DEFAULT '[]'::jsonb;

-- メタデータ抽出状態管理
ALTER TABLE file_metadata 
ADD COLUMN IF NOT EXISTS maiml_metadata_extracted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS maiml_metadata_extraction_status VARCHAR(50) DEFAULT 'pending';

DO $$
BEGIN
    RAISE NOTICE '✅ [Migration] カラム追加完了';
END $$;

-- ============================================================
-- インデックス作成
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 [Migration] インデックスを作成中...';
END $$;

-- maiml_document_uuid用B-treeインデックス（Document UUID検索用）
CREATE INDEX IF NOT EXISTS idx_file_metadata_maiml_doc_uuid 
  ON file_metadata(maiml_document_uuid) 
  WHERE maiml_document_uuid IS NOT NULL;

-- maiml_document_name用B-treeインデックス（Document名検索用）
CREATE INDEX IF NOT EXISTS idx_file_metadata_maiml_doc_name 
  ON file_metadata(maiml_document_name) 
  WHERE maiml_document_name IS NOT NULL;

-- MAIML属性情報用GINインデックス（JSONB配列検索用）
CREATE INDEX IF NOT EXISTS idx_file_metadata_maiml_measurement_values_gin 
  ON file_metadata USING GIN (maiml_measurement_values);

CREATE INDEX IF NOT EXISTS idx_file_metadata_maiml_units_gin 
  ON file_metadata USING GIN (maiml_units);

CREATE INDEX IF NOT EXISTS idx_file_metadata_maiml_section_types_gin 
  ON file_metadata USING GIN (maiml_section_types);

CREATE INDEX IF NOT EXISTS idx_file_metadata_maiml_ids_gin 
  ON file_metadata USING GIN (maiml_ids);

CREATE INDEX IF NOT EXISTS idx_file_metadata_maiml_refs_gin 
  ON file_metadata USING GIN (maiml_refs);

CREATE INDEX IF NOT EXISTS idx_file_metadata_maiml_keys_gin 
  ON file_metadata USING GIN (maiml_keys);

CREATE INDEX IF NOT EXISTS idx_file_metadata_maiml_elements_gin 
  ON file_metadata USING GIN (maiml_elements);

CREATE INDEX IF NOT EXISTS idx_file_metadata_maiml_values_gin 
  ON file_metadata USING GIN (maiml_values);

-- maiml_metadata_extraction_status用B-treeインデックス（抽出状態検索用）
CREATE INDEX IF NOT EXISTS idx_file_metadata_maiml_extraction_status 
  ON file_metadata(maiml_metadata_extraction_status);

DO $$
BEGIN
    RAISE NOTICE '✅ [Migration] インデックス作成完了（11個のインデックスを作成）';
END $$;

-- ============================================================
-- カラムコメント追加
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 [Migration] カラムコメントを追加中...';
END $$;

COMMENT ON COLUMN file_metadata.maiml_document_uuid IS 'MAIML Document UUID（検索用）- maimlMetadataExtractor.jsによって自動抽出';
COMMENT ON COLUMN file_metadata.maiml_document_name IS 'MAIML Document名（検索用）- maimlMetadataExtractor.jsによって自動抽出';
COMMENT ON COLUMN file_metadata.maiml_document_description IS 'MAIML Document説明（検索用）- maimlMetadataExtractor.jsによって自動抽出';
COMMENT ON COLUMN file_metadata.maiml_measurement_values IS 'MAIML測定値配列（検索用）- maimlMetadataExtractor.jsによって自動抽出、JSONB形式';
COMMENT ON COLUMN file_metadata.maiml_units IS 'MAIML単位配列（検索用）- maimlMetadataExtractor.jsによって自動抽出、JSONB形式';
COMMENT ON COLUMN file_metadata.maiml_section_types IS 'MAIMLセクション種別配列（検索用）- maimlMetadataExtractor.jsによって自動抽出、JSONB形式';
COMMENT ON COLUMN file_metadata.maiml_ids IS 'MAIML ID属性配列（検索用）- maimlMetadataExtractor.jsによって自動抽出、JSONB形式';
COMMENT ON COLUMN file_metadata.maiml_refs IS 'MAIML Ref属性配列（検索用）- maimlMetadataExtractor.jsによって自動抽出、JSONB形式';
COMMENT ON COLUMN file_metadata.maiml_keys IS 'MAIML Key属性配列（検索用）- maimlMetadataExtractor.jsによって自動抽出、JSONB形式';
COMMENT ON COLUMN file_metadata.maiml_elements IS 'MAIML Element名配列（検索用）- maimlMetadataExtractor.jsによって自動抽出、JSONB形式';
COMMENT ON COLUMN file_metadata.maiml_values IS 'MAIML汎用Value配列（検索用）- maimlMetadataExtractor.jsによって自動抽出、JSONB形式';
COMMENT ON COLUMN file_metadata.maiml_metadata_extracted_at IS 'MAIMLメタデータ抽出日時 - 最終抽出実行時刻';
COMMENT ON COLUMN file_metadata.maiml_metadata_extraction_status IS 'MAIMLメタデータ抽出状態 - pending/success/failed';

DO $$
BEGIN
    RAISE NOTICE '✅ [Migration] カラムコメント追加完了';
END $$;

-- ============================================================
-- 完了メッセージ
-- ============================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ [Migration] file_metadataテーブルにMAIML検索用メタデータカラム追加完了';
    RAISE NOTICE '';
    RAISE NOTICE '📋 追加されたカラム（13カラム）:';
    RAISE NOTICE '   📄 Document情報: maiml_document_uuid, maiml_document_name, maiml_document_description';
    RAISE NOTICE '   📊 測定データ: maiml_measurement_values, maiml_units';
    RAISE NOTICE '   🏗️ 構造情報: maiml_section_types';
    RAISE NOTICE '   🏷️ 属性情報: maiml_ids, maiml_refs, maiml_keys, maiml_elements, maiml_values';
    RAISE NOTICE '   ⏰ 状態管理: maiml_metadata_extracted_at, maiml_metadata_extraction_status';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 追加されたインデックス（11個）:';
    RAISE NOTICE '   - B-tree x 3: maiml_document_uuid, maiml_document_name, maiml_metadata_extraction_status';
    RAISE NOTICE '   - GIN x 8: JSONB配列検索用（測定値、単位、構造、属性情報）';
    RAISE NOTICE '';
    RAISE NOTICE '📝 用途: backend/reference/services/maimlMetadataExtractor.js によって自動抽出・更新';
    RAISE NOTICE '';
END $$;

-- ============================================================
-- ロールバック用SQL（参考）
-- ============================================================

-- ロールバックが必要な場合は、以下のSQLを実行してください：
--
-- -- インデックス削除
-- DROP INDEX IF EXISTS idx_file_metadata_maiml_doc_uuid;
-- DROP INDEX IF EXISTS idx_file_metadata_maiml_doc_name;
-- DROP INDEX IF EXISTS idx_file_metadata_maiml_measurement_values_gin;
-- DROP INDEX IF EXISTS idx_file_metadata_maiml_units_gin;
-- DROP INDEX IF EXISTS idx_file_metadata_maiml_section_types_gin;
-- DROP INDEX IF EXISTS idx_file_metadata_maiml_ids_gin;
-- DROP INDEX IF EXISTS idx_file_metadata_maiml_refs_gin;
-- DROP INDEX IF EXISTS idx_file_metadata_maiml_keys_gin;
-- DROP INDEX IF EXISTS idx_file_metadata_maiml_elements_gin;
-- DROP INDEX IF EXISTS idx_file_metadata_maiml_values_gin;
-- DROP INDEX IF EXISTS idx_file_metadata_maiml_extraction_status;
--
-- -- カラム削除
-- ALTER TABLE file_metadata 
-- DROP COLUMN IF EXISTS maiml_document_uuid,
-- DROP COLUMN IF EXISTS maiml_document_name,
-- DROP COLUMN IF EXISTS maiml_document_description,
-- DROP COLUMN IF EXISTS maiml_measurement_values,
-- DROP COLUMN IF EXISTS maiml_units,
-- DROP COLUMN IF EXISTS maiml_section_types,
-- DROP COLUMN IF EXISTS maiml_ids,
-- DROP COLUMN IF EXISTS maiml_refs,
-- DROP COLUMN IF EXISTS maiml_keys,
-- DROP COLUMN IF EXISTS maiml_elements,
-- DROP COLUMN IF EXISTS maiml_values,
-- DROP COLUMN IF EXISTS maiml_metadata_extracted_at,
-- DROP COLUMN IF EXISTS maiml_metadata_extraction_status;
