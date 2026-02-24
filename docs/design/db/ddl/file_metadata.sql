-- ============================================================
-- file_metadata テーブル定義 (v3.0 - Phase 3統合版)
-- ============================================================
-- 作成日: 2026-01-16
-- 最終更新: 2026-01-19
-- 目的: S3ファイルアクセス + Phase 2詳細検索機能 + Phase 3アップロード管理
-- 
-- 【カラム構成: 20カラム】
-- ■ Phase 0 (初期実装) - S3アクセス必須: 9カラム
--   - 主キー: file_key (S3キー、自然キー)
--   - S3アクセス必須: s3_bucket, organization_id
--   - ファイル情報: original_filename, file_size, file_type
--   - 管理情報: uploaded_by, created_at, updated_at
-- 
-- ■ Phase 2 (統合完了) - 詳細検索機能: 6カラム
--   - custom_metadata (JSONB): MAIML解析メタデータ（検索対象）
--   - tags (JSONB): 検索タグ配列
--   - search_keywords (TEXT[]): 自動生成キーワード
--   - description (TEXT): ファイル説明
--   - file_hash (VARCHAR(64)): SHA-256ハッシュ（重複検出用）
--   - parent_folder_path (VARCHAR(500)): 親フォルダパス
-- 
-- ■ Phase 3 (2026-01-19統合) - アップロード管理: 5カラム
--   - upload_batch_id (VARCHAR(255)): 一括アップロード時のバッチID
--   - upload_source (VARCHAR(50)): アップロード元（web_upload等）
--   - upload_method (VARCHAR(50)): アップロード方法（single等）
--   - s3_storage_class (VARCHAR(50)): S3ストレージクラス
--   - s3_etag (VARCHAR(100)): S3 ETag（整合性チェック用）
-- 
-- 【将来追加予定】
-- - Phase 1: MAIML解析メタデータ（maiml_transitions_count等）
-- - Phase 4以降: アクセス制御・監査ログ・ドラフト管理等
-- ============================================================

-- ============================================================
-- テーブル作成
-- ============================================================
CREATE TABLE IF NOT EXISTS file_metadata (
    -- ============================================
    -- 主キー（S3キーを自然キーとして使用）
    -- ============================================
    
    -- S3キー（主キー）
    -- 例: "org_maiml_lab_001/projects/sample_project/sample_project.maiml"
    file_key VARCHAR(500) PRIMARY KEY,
    
    -- ============================================
    -- S3アクセス必須カラム
    -- ============================================
    
    -- S3バケット名
    -- 例: "mmdpf-files" (OpenStack Swift) または "mmdpf-production" (AWS S3)
    s3_bucket VARCHAR(100) NOT NULL,
    
    -- 組織ID（マルチテナント分離必須）
    -- 例: "550e8400-e29b-41d4-a716-446655440000"
    organization_id UUID NOT NULL,
    
    -- ============================================
    -- ファイル情報（参考情報）
    -- ============================================
    
    -- 元のファイル名
    -- 例: "sample_project.maiml"
    original_filename VARCHAR(255) NOT NULL,
    
    -- ファイルサイズ（バイト）
    -- 例: 1048576 (1MB)
    file_size BIGINT NOT NULL,
    
    -- MIMEタイプ
    -- 例: "application/xml", "text/plain"
    file_type VARCHAR(100),
    
    file_extension VARCHAR(10),
    is_maiml_file BOOLEAN DEFAULT FALSE,
    maiml_analysis_status VARCHAR(20) DEFAULT 'not_analyzed',
    maiml_error_count INTEGER DEFAULT 0,
    maiml_warning_count INTEGER DEFAULT 0,
    maiml_version VARCHAR(20),
    maiml_transitions_count INTEGER,
    maiml_places_count INTEGER,
    maiml_validation_result JSONB DEFAULT '{}'::jsonb,
    maiml_last_analyzed TIMESTAMP WITH TIME ZONE,
    last_edit_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- ============================================
    -- 管理情報
    -- ============================================
    
    -- アップロードユーザー
    -- 例: "user_001", "system"
    uploaded_by VARCHAR(100) NOT NULL,
    
    -- 監査証跡
    create_user_id VARCHAR(50),
    update_user_id VARCHAR(50),
    
    -- 作成日時（自動設定）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 更新日時（自動設定・トリガーで自動更新）
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- ============================================
    -- Phase 2: 詳細検索機能（2026-01-19統合）
    -- ============================================
    
    -- カスタムメタデータ（MAIML解析結果、検索対象）
    -- document情報、measurement情報、section情報、attributes情報を格納
    custom_metadata JSONB DEFAULT '{}'::jsonb,
    
    -- 検索タグ（配列形式、ユーザー手動付与）
    -- 例: ["実験", "材料A", "合成"]
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- 検索キーワード（自動生成、全文検索補助）
    -- MAIML解析時に抽出
    search_keywords TEXT[],
    
    -- ファイル説明（ユーザー入力）
    -- 自由記述テキスト
    description TEXT,
    
    -- SHA-256ハッシュ（重複検出用）
    -- ファイル内容の一意性を保証
    file_hash VARCHAR(64),
    
    -- 親フォルダパス（階層管理用）
    -- 例: "org_maiml_lab_001/projects/sample_project"
    parent_folder_path VARCHAR(500),
    
    -- ============================================
    -- Phase 2.5: MAIML検索用メタデータ（2026-02-20追加）
    -- ============================================
    
    -- MAIML Document情報（検索用）
    -- maimlMetadataExtractor.jsによって自動抽出
    maiml_document_uuid VARCHAR(255),
    maiml_document_name TEXT,
    maiml_document_description TEXT,
    
    -- MAIML測定データ情報（JSONB配列で複数値対応）
    -- maimlMetadataExtractor.jsによって自動抽出
    maiml_measurement_values JSONB DEFAULT '[]'::jsonb,
    maiml_units JSONB DEFAULT '[]'::jsonb,
    
    -- MAIML構造情報（JSONB配列で複数値対応）
    -- maimlMetadataExtractor.jsによって自動抽出
    maiml_section_types JSONB DEFAULT '[]'::jsonb,
    
    -- MAIML属性情報（JSONB配列で複数値対応）
    -- maimlMetadataExtractor.jsによって自動抽出
    maiml_ids JSONB DEFAULT '[]'::jsonb,
    maiml_refs JSONB DEFAULT '[]'::jsonb,
    maiml_keys JSONB DEFAULT '[]'::jsonb,
    maiml_elements JSONB DEFAULT '[]'::jsonb,
    maiml_values JSONB DEFAULT '[]'::jsonb,
    
    -- メタデータ抽出状態管理
    maiml_metadata_extracted_at TIMESTAMP WITH TIME ZONE,
    maiml_metadata_extraction_status VARCHAR(50) DEFAULT 'pending',
    
    -- ============================================
    -- Phase 3: アップロード管理（2026-01-19統合）
    -- ============================================
    
    -- 一括アップロード時のバッチID（UUID形式）
    -- 例: "550e8400-e29b-41d4-a716-446655440001"
    upload_batch_id VARCHAR(255),
    
    -- アップロード元
    -- 許可値: web_upload, bulk_upload, folder_upload, api_upload
    upload_source VARCHAR(50) DEFAULT 'web_upload',
    
    -- アップロード方法
    -- 許可値: single, multipart, resumable
    upload_method VARCHAR(50) DEFAULT 'single'
      CHECK (upload_method IN ('single', 'multipart', 'resumable')),
    
    -- S3ストレージクラス
    -- 例: STANDARD, INTELLIGENT_TIERING, GLACIER
    s3_storage_class VARCHAR(50) DEFAULT 'STANDARD',
    
    -- S3 ETag（整合性チェック用）
    -- MD5ハッシュまたはマルチパートアップロードのETag
    s3_etag VARCHAR(100)
);

-- ============================================================
-- インデックス作成
-- ============================================================

-- 注意: file_key は主キーなので、自動的にインデックスが作成されます
-- 追加のインデックスは不要です

-- ============================================
-- Phase 0: 基本インデックス
-- ============================================

-- organization_id 用インデックス（マルチテナント分離必須）
-- 用途: 組織単位でのファイル一覧取得
CREATE INDEX idx_file_metadata_organization_id ON file_metadata(organization_id);

-- uploaded_by 用インデックス
-- 用途: ユーザー単位でのアップロードファイル一覧取得
CREATE INDEX idx_file_metadata_uploaded_by ON file_metadata(uploaded_by);

-- ============================================
-- Phase 2: 検索機能インデックス（2026-01-19統合）
-- ============================================

-- custom_metadata用GINインデックス（JSONB検索用）
CREATE INDEX idx_file_metadata_custom_metadata_gin 
  ON file_metadata USING GIN (custom_metadata);

-- tags用GINインデックス（配列検索用）
CREATE INDEX idx_file_metadata_tags_gin 
  ON file_metadata USING GIN (tags);

-- search_keywords用GINインデックス（全文検索補助）
CREATE INDEX idx_file_metadata_search_keywords_gin 
  ON file_metadata USING GIN (search_keywords);

-- file_hash用B-treeインデックス（重複検出用）
CREATE INDEX idx_file_metadata_file_hash 
  ON file_metadata(file_hash);

-- parent_folder_path用B-treeインデックス（階層管理用）
CREATE INDEX idx_file_metadata_parent_folder 
  ON file_metadata(parent_folder_path);

-- ============================================
-- Phase 2.5: MAIML検索用メタデータインデックス（2026-02-20追加）
-- ============================================

-- maiml_document_uuid用B-treeインデックス（Document UUID検索用）
CREATE INDEX idx_file_metadata_maiml_doc_uuid 
  ON file_metadata(maiml_document_uuid) 
  WHERE maiml_document_uuid IS NOT NULL;

-- maiml_document_name用B-treeインデックス（Document名検索用）
CREATE INDEX idx_file_metadata_maiml_doc_name 
  ON file_metadata(maiml_document_name) 
  WHERE maiml_document_name IS NOT NULL;

-- MAIML属性情報用GINインデックス（JSONB配列検索用）
CREATE INDEX idx_file_metadata_maiml_measurement_values_gin 
  ON file_metadata USING GIN (maiml_measurement_values);

CREATE INDEX idx_file_metadata_maiml_units_gin 
  ON file_metadata USING GIN (maiml_units);

CREATE INDEX idx_file_metadata_maiml_section_types_gin 
  ON file_metadata USING GIN (maiml_section_types);

CREATE INDEX idx_file_metadata_maiml_ids_gin 
  ON file_metadata USING GIN (maiml_ids);

CREATE INDEX idx_file_metadata_maiml_refs_gin 
  ON file_metadata USING GIN (maiml_refs);

CREATE INDEX idx_file_metadata_maiml_keys_gin 
  ON file_metadata USING GIN (maiml_keys);

CREATE INDEX idx_file_metadata_maiml_elements_gin 
  ON file_metadata USING GIN (maiml_elements);

CREATE INDEX idx_file_metadata_maiml_values_gin 
  ON file_metadata USING GIN (maiml_values);

-- maiml_metadata_extraction_status用B-treeインデックス（抽出状態検索用）
CREATE INDEX idx_file_metadata_maiml_extraction_status 
  ON file_metadata(maiml_metadata_extraction_status);

-- ============================================
-- Phase 3: アップロード管理インデックス（2026-01-19統合）
-- ============================================

-- upload_batch_id用B-treeインデックス（バッチ単位での操作用）
CREATE INDEX idx_file_metadata_upload_batch 
  ON file_metadata(upload_batch_id);

-- ============================================================
-- 外部キー制約
-- ============================================================

-- organization_id → organizations テーブル
-- マルチテナント分離の整合性を保証
ALTER TABLE file_metadata 
    ADD CONSTRAINT fk_file_metadata_organization 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(organization_id)
    ON DELETE CASCADE;

-- 注意: uploaded_by に対する外部キー制約は、
-- ユーザー管理テーブル（users, organization_user等）が確定次第追加してください
-- 
-- 例:
-- ALTER TABLE file_metadata 
--     ADD CONSTRAINT fk_file_metadata_uploaded_by 
--     FOREIGN KEY (uploaded_by) 
--     REFERENCES organization_user(user_id)
--     ON DELETE SET NULL;

-- ============================================================
-- トリガー作成
-- ============================================================

-- updated_at 自動更新トリガー
-- 注意: update_updated_at_column() 関数が事前に定義されている必要があります
-- 
-- 関数が未定義の場合は以下を実行してください:
-- 
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- 
CREATE TRIGGER update_file_metadata_updated_at
    BEFORE UPDATE ON file_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- テーブル・カラムコメント
-- ============================================================

COMMENT ON TABLE file_metadata IS 'S3/Swiftファイルのメタデータ管理テーブル（v2.0 - Phase 2統合版: S3アクセス + 詳細検索機能、file_keyを主キーとする自然キー設計）';

-- Phase 0: 基本カラム
COMMENT ON COLUMN file_metadata.file_key IS 'S3キー（org_prefix/path/to/file形式、主キー）';
COMMENT ON COLUMN file_metadata.s3_bucket IS 'S3バケット名またはSwiftコンテナ名';
COMMENT ON COLUMN file_metadata.organization_id IS '組織ID（マルチテナント分離用、必須）';
COMMENT ON COLUMN file_metadata.original_filename IS '元のファイル名（アップロード時の名前）';
COMMENT ON COLUMN file_metadata.file_size IS 'ファイルサイズ（バイト単位）';
COMMENT ON COLUMN file_metadata.file_type IS 'MIMEタイプ（例: application/xml）';
COMMENT ON COLUMN file_metadata.uploaded_by IS 'アップロードユーザーID';
COMMENT ON COLUMN file_metadata.create_user_id IS '作成者ユーザID（監査証跡）';
COMMENT ON COLUMN file_metadata.update_user_id IS '更新者ユーザID（監査証跡）';
COMMENT ON COLUMN file_metadata.created_at IS '作成日時（自動設定）';
COMMENT ON COLUMN file_metadata.updated_at IS '更新日時（トリガーで自動更新）';

-- Phase 2: 詳細検索機能カラム（2026-01-19統合）
COMMENT ON COLUMN file_metadata.custom_metadata IS 'カスタムメタデータ（MAIML解析結果、検索対象）- document情報、measurement情報、section情報、attributes情報を格納';
COMMENT ON COLUMN file_metadata.tags IS '検索タグ（配列形式、ユーザー手動付与）- ["実験", "材料A", "合成"]のような形式';
COMMENT ON COLUMN file_metadata.search_keywords IS '検索キーワード（自動生成、全文検索補助）- MAIML解析時に抽出';
COMMENT ON COLUMN file_metadata.description IS 'ファイル説明（ユーザー入力）- 自由記述テキスト';
COMMENT ON COLUMN file_metadata.file_hash IS 'SHA-256ハッシュ（重複検出用）- ファイル内容の一意性を保証';
COMMENT ON COLUMN file_metadata.parent_folder_path IS '親フォルダパス（階層管理用）- 例: "org_maiml_lab_001/projects/sample_project"';

-- Phase 2.5: MAIML検索用メタデータカラム（2026-02-20追加）
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

-- Phase 3: アップロード管理カラム（2026-01-19統合）
COMMENT ON COLUMN file_metadata.upload_batch_id IS '一括アップロード時のバッチID（UUID形式）- バッチ単位でのファイル操作に使用';
COMMENT ON COLUMN file_metadata.upload_source IS 'アップロード元（web_upload, bulk_upload, folder_upload, api_upload）';
COMMENT ON COLUMN file_metadata.upload_method IS 'アップロード方法（single, multipart, resumable）';
COMMENT ON COLUMN file_metadata.s3_storage_class IS 'S3ストレージクラス（STANDARD, INTELLIGENT_TIERING, GLACIER等）';
COMMENT ON COLUMN file_metadata.s3_etag IS 'S3 ETag（MD5ハッシュ、整合性チェック用）';

-- ============================================================
-- 使用例
-- ============================================================

-- 【例1】ファイルメタデータの登録（Phase 2カラム含む）
-- INSERT INTO file_metadata (
--     file_key,
--     s3_bucket,
--     organization_id,
--     original_filename,
--     file_size,
--     file_type,
--     uploaded_by,
--     custom_metadata,
--     tags,
--     description,
--     parent_folder_path
-- ) VALUES (
--     'org_maiml_lab_001/projects/sample_project/sample_project.maiml',
--     'mmdpf-files',
--     '550e8400-e29b-41d4-a716-446655440000'::UUID,
--     'sample_project.maiml',
--     1048576,
--     'application/xml',
--     'user_001',
--     '{"document": {"name": "実験A", "description": "材料合成実験"}}'::jsonb,
--     '["実験", "材料A"]'::jsonb,
--     '材料Aの合成実験記録',
--     'org_maiml_lab_001/projects/sample_project'
-- );

-- 【例2】ファイルメタデータの取得（マルチテナント分離）
-- SELECT * FROM file_metadata 
-- WHERE file_key = 'org_maiml_lab_001/projects/sample_project/sample_project.maiml'
--   AND organization_id = '550e8400-e29b-41d4-a716-446655440000'::UUID;

-- 【例3】組織単位でのファイル一覧取得
-- SELECT 
--     file_key,
--     original_filename,
--     file_size,
--     uploaded_by,
--     created_at
-- FROM file_metadata 
-- WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000'::UUID
-- ORDER BY created_at DESC;

-- 【例4】Phase 2 - JSONB検索（custom_metadata @> 演算子）
-- SELECT * FROM file_metadata
-- WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000'::UUID
--   AND custom_metadata @> '{"document": {"name": "実験A"}}'::jsonb;

-- 【例5】Phase 2 - タグ検索
-- SELECT * FROM file_metadata
-- WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000'::UUID
--   AND tags @> '["実験"]'::jsonb;

-- 【例6】Phase 2 - キーワード検索
-- SELECT * FROM file_metadata
-- WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000'::UUID
--   AND search_keywords @> ARRAY['実験', '材料A']::TEXT[];

-- 【例7】Phase 2 - ファイルハッシュでの重複検出
-- SELECT file_key FROM file_metadata
-- WHERE file_hash = 'abc123...' 
--   AND organization_id = '550e8400-e29b-41d4-a716-446655440000'::UUID;

-- ============================================================
-- 補足情報
-- ============================================================

-- 【マルチテナント分離の重要性】
-- すべてのクエリで organization_id フィルタを必須とすること。
-- これにより異なる組織間でのデータ漏洩を防ぐ。
-- 
-- ❌ 悪い例:
-- SELECT * FROM file_metadata WHERE file_key = $1;
-- 
-- ✅ 良い例:
-- SELECT * FROM file_metadata 
-- WHERE file_key = $1 AND organization_id = $2;

-- 【custom_metadata の構造例】
-- {
--   "document": {
--     "uuid": "doc-uuid-001",
--     "name": "実験A",
--     "description": "材料合成実験"
--   },
--   "measurements": [
--     {
--       "measurement_value": "25.5",
--       "units": "℃"
--     }
--   ],
--   "sections": [
--     {
--       "section_type": "Material"
--     }
--   ],
--   "attributes": {
--     "id": ["material_001", "condition_001"],
--     "ref": ["ref_001", "ref_002"],
--     "key": ["temp", "pressure"],
--     "element": ["Material", "Condition", "Result"],
--     "value": ["value1", "value2"]
--   }
-- }

-- 【将来の拡張計画】
-- Phase 1: MAIML解析メタデータ追加
--   - maiml_transitions_count INTEGER
--   - maiml_places_count INTEGER
--   - maiml_validation_result JSONB
--   - maiml_analysis_status VARCHAR(20)
--   - maiml_last_analyzed TIMESTAMP
-- 
-- Phase 3: アップロード管理追加
--   - upload_batch_id VARCHAR(255)
--   - upload_source VARCHAR(50)
--   - upload_timestamp TIMESTAMP
-- 
-- Phase 4以降: アクセス制御・監査ログ・ドラフト管理等を段階的に追加

-- ============================================================
-- 関連ドキュメント
-- ============================================================

-- 詳細仕様: docs/design/db/db_table_list.md
-- 拡張計画: docs/20260116_file_metadata_拡張カラム_引継ぎ.md
-- 調査結果: docs/20260116_1336_file_metadata使用状況調査_結果.md
-- タスク計画: docs/20260116_1320_file_metadata反映_PLAN.md

-- ============================================================
-- 変更履歴
-- ============================================================

-- 2026-01-19: Phase 3統合（v3.0 - アップロード管理機能追加）
--   - 5カラム追加: upload_batch_id, upload_source, upload_method, s3_storage_class, s3_etag
--   - 1インデックス追加: upload_batch_id用B-tree（バッチ単位での操作用）
--   - CHECK制約追加: upload_source, upload_method
--   - file_metadata_phase3_migration.sqlを統合

-- 2026-01-19: Phase 2統合（v2.0 - 詳細検索機能追加）
--   - 6カラム追加: custom_metadata, tags, search_keywords, description, file_hash, parent_folder_path
--   - 5インデックス追加: GIN x 3 (JSONB/配列検索用), B-tree x 2 (重複検出/階層管理用)
--   - file_metadata_phase2_migration.sqlを統合
-- 
-- 2026-01-16: 初版作成（v1.0 - S3アクセス必須9カラム、file_keyを主キーとする自然キー設計）
--   - 主キー: file_key (VARCHAR(500))
--   - インデックス: organization_id, uploaded_by（2個）
--   - トリガー: updated_at自動更新
