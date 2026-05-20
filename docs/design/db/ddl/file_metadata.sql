-- ============================================================
-- file_metadata テーブル定義 (v4.0 - 不要カラム削除版)
-- ============================================================
-- 作成日: 2026-01-16
-- 最終更新: 2026-05-19
-- 目的: S3ファイルアクセス + MAIML解析状態管理 + Phase 3アップロード管理
-- 
-- 【カラム構成】
-- ■ 基本カラム
--   - 主キー: file_key (S3キー、自然キー)
--   - S3アクセス必須: s3_bucket, organization_id
--   - ファイル情報: original_filename, file_size, file_type, file_extension
--   - MAIML解析状態: is_maiml_file, maiml_analysis_status, maiml_error_count,
--                    maiml_warning_count, maiml_version, maiml_transitions_count,
--                    maiml_places_count, maiml_last_analyzed
--   - 管理情報: uploaded_by, create_user_id, update_user_id, created_at, updated_at
-- 
-- ■ 検索補助カラム（残存）
--   - file_hash (VARCHAR(64)): SHA-256ハッシュ（重複検出用）
--   - parent_folder_path (VARCHAR(500)): 親フォルダパス
-- 
-- ■ アップロード管理カラム
--   - upload_batch_id, upload_source, upload_method
-- 
-- ■ プロジェクト連携カラム
--   - project_uuid: project.project_uuidと同値（MAIMLファイル特定用）
-- 
-- 【2026-05-19 削除済みカラム】
--   - custom_metadata, tags, search_keywords, description（値設定コードなし）
--   - maiml_document_uuid 〜 maiml_metadata_extraction_status（maimlMetadataExtractorがfile_metadataに書き込まない）
--   - s3_storage_class, s3_etag（DEFAULT値のみ/設定コードなし）
--   - maiml_validation_result, last_edit_timestamp（設定コードなし）
--   詳細: backend/migrations/20260519_remove_unused_columns_from_file_metadata.sql
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
    maiml_last_analyzed TIMESTAMP WITH TIME ZONE,
    
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
    
    -- SHA-256ハッシュ（重複検出用）
    -- ファイル内容の一意性を保証
    file_hash VARCHAR(64),
    
    -- 親フォルダパス（階層管理用）
    -- 例: "org_maiml_lab_001/projects/sample_project"
    parent_folder_path VARCHAR(500),
    
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

    -- ============================================
    -- プロジェクトUUID（2026-04-02追加）
    -- ============================================

    -- プロジェクトUUID（project.project_uuidと同値）
    -- MAIMLファイルの<Document uuid>と同値
    -- プロジェクト名変更時もこのUUIDは不変
    project_uuid UUID
);

-- project_uuid用ユニーク制約（2026-04-14追加）
ALTER TABLE file_metadata ADD CONSTRAINT uk_file_metadata_project_uuid
UNIQUE (project_uuid) ;

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
-- Phase 2: 検索補助インデックス
-- ============================================

-- file_hash用B-treeインデックス（重複検出用）
CREATE INDEX idx_file_metadata_file_hash 
  ON file_metadata(file_hash);

-- parent_folder_path用B-treeインデックス（階層管理用）
CREATE INDEX idx_file_metadata_parent_folder 
  ON file_metadata(parent_folder_path);

-- ============================================
-- Phase 3: アップロード管理インデックス（2026-01-19統合）
-- ============================================

-- upload_batch_id用B-treeインデックス（バッチ単位での操作用）
CREATE INDEX idx_file_metadata_upload_batch 
  ON file_metadata(upload_batch_id);

-- ============================================================
-- テーブル・カラムコメント
-- ============================================================

COMMENT ON TABLE file_metadata IS 'S3/Swiftファイルのメタデータ管理テーブル（v4.0 - 不要カラム削除版）';

-- 基本カラム
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

-- 検索補助カラム
COMMENT ON COLUMN file_metadata.file_hash IS 'SHA-256ハッシュ（重複検出用）- ファイル内容の一意性を保証';
COMMENT ON COLUMN file_metadata.parent_folder_path IS '親フォルダパス（階層管理用）- 例: "org_maiml_lab_001/projects/sample_project"';

-- アップロード管理カラム
COMMENT ON COLUMN file_metadata.upload_batch_id IS '一括アップロード時のバッチID（UUID形式）- バッチ単位でのファイル操作に使用';
COMMENT ON COLUMN file_metadata.upload_source IS 'アップロード元（web_upload, bulk_upload, folder_upload, api_upload）';
COMMENT ON COLUMN file_metadata.upload_method IS 'アップロード方法（single, multipart, resumable）';

-- プロジェクト連携カラム
COMMENT ON COLUMN file_metadata.project_uuid IS 'プロジェクトUUID（project.project_uuidと同値）- MAIMLファイル特定用';

-- ============================================================
-- 使用例
-- ============================================================

-- 【例1】ファイルメタデータの登録
-- INSERT INTO file_metadata (
--     file_key, s3_bucket, organization_id, original_filename,
--     file_size, file_type, uploaded_by, parent_folder_path
-- ) VALUES (
--     'org_maiml_lab_001/projects/sample_project/sample_project.maiml',
--     'mmdpf-files',
--     '550e8400-e29b-41d4-a716-446655440000'::UUID,
--     'sample_project.maiml',
--     1048576, 'application/xml', 'user_001',
--     'org_maiml_lab_001/projects/sample_project'
-- );

-- 【例2】ファイルメタデータの取得（マルチテナント分離）
-- SELECT * FROM file_metadata 
-- WHERE file_key = 'org_maiml_lab_001/projects/sample_project/sample_project.maiml'
--   AND organization_id = '550e8400-e29b-41d4-a716-446655440000'::UUID;

-- 【例3】組織単位でのファイル一覧取得
-- SELECT file_key, original_filename, file_size, uploaded_by, created_at
-- FROM file_metadata 
-- WHERE organization_id = '550e8400-e29b-41d4-a716-446655440000'::UUID
-- ORDER BY created_at DESC;

-- 【例4】ファイルハッシュでの重複検出
-- SELECT file_key FROM file_metadata
-- WHERE file_hash = 'abc123...' 
--   AND organization_id = '550e8400-e29b-41d4-a716-446655440000'::UUID;

-- ============================================================
-- 補足情報
-- ============================================================

-- 【マルチテナント分離の重要性】
-- すべてのクエリで organization_id フィルタを必須とすること。
-- 
-- ❌ 悪い例: SELECT * FROM file_metadata WHERE file_key = $1;
-- ✅ 良い例: SELECT * FROM file_metadata WHERE file_key = $1 AND organization_id = $2;

-- ============================================================
-- 関連ドキュメント
-- ============================================================

-- 詳細仕様: docs/design/db/db_table_list.md
-- マイグレーション: backend/migrations/20260519_remove_unused_columns_from_file_metadata.sql

-- ============================================================
-- 変更履歴
-- ============================================================

-- 2026-05-19: v4.0 - 不要カラム削除
--   - 21カラム削除: custom_metadata, tags, search_keywords, description,
--     maiml_document_uuid, maiml_document_name, maiml_document_description,
--     maiml_measurement_values, maiml_units, maiml_section_types, maiml_ids,
--     maiml_refs, maiml_keys, maiml_elements, maiml_values,
--     maiml_metadata_extracted_at, maiml_metadata_extraction_status,
--     s3_storage_class, s3_etag, maiml_validation_result, last_edit_timestamp
--   - 関連インデックス11本削除
--   - マイグレーション: 20260519_remove_unused_columns_from_file_metadata.sql

-- 2026-04-14: project_uuid用ユニーク制約追加（uk_file_metadata_project_uuid）

-- 2026-04-02: project_uuidカラム追加

-- 2026-01-19: v3.0 - アップロード管理カラム追加（upload_batch_id, upload_source, upload_method, s3_storage_class, s3_etag）

-- 2026-01-19: v2.0 - 詳細検索機能カラム追加（custom_metadata, tags, search_keywords, description, file_hash, parent_folder_path）

-- 2026-01-16: v1.0 - 初版作成（S3アクセス必須9カラム、file_keyを主キーとする自然キー設計）
