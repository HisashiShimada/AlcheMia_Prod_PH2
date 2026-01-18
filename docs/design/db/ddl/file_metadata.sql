-- ============================================================
-- file_metadata テーブル定義 (v1.0 - 初期実装)
-- ============================================================
-- 作成日: 2026-01-16
-- 目的: S3ファイルアクセスに必要な最小限のメタデータ管理
-- 
-- 【初期実装カラム: 9カラム】
-- - 主キー: file_key (S3キー、自然キー)
-- - S3アクセス必須: s3_bucket, organization_id
-- - ファイル情報: original_filename, file_size, file_type
-- - 管理情報: uploaded_by, created_at, updated_at
-- 
-- 【将来追加予定】
-- - v2.0: MAIML解析メタデータ（maiml_transitions_count等）
-- - v3.0: アップロード管理（upload_batch_id等）
-- - v4.0以降: 検索・統計・ドラフト管理等
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
    
    -- ============================================
    -- 管理情報
    -- ============================================
    
    -- アップロードユーザー
    -- 例: "user_001", "system"
    uploaded_by VARCHAR(100) NOT NULL,
    
    -- 作成日時（自動設定）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 更新日時（自動設定・トリガーで自動更新）
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- インデックス作成
-- ============================================================

-- 注意: file_key は主キーなので、自動的にインデックスが作成されます
-- 追加のインデックスは不要です

-- organization_id 用インデックス（マルチテナント分離必須）
-- 用途: 組織単位でのファイル一覧取得
CREATE INDEX idx_file_metadata_organization_id ON file_metadata(organization_id);

-- uploaded_by 用インデックス
-- 用途: ユーザー単位でのアップロードファイル一覧取得
CREATE INDEX idx_file_metadata_uploaded_by ON file_metadata(uploaded_by);

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

COMMENT ON TABLE file_metadata IS 'S3/Swiftファイルのメタデータ管理テーブル（v1.0 - 初期実装: S3アクセス必須カラムのみ、file_keyを主キーとする自然キー設計）';

COMMENT ON COLUMN file_metadata.file_key IS 'S3キー（org_prefix/path/to/file形式、主キー）';
COMMENT ON COLUMN file_metadata.s3_bucket IS 'S3バケット名またはSwiftコンテナ名';
COMMENT ON COLUMN file_metadata.organization_id IS '組織ID（マルチテナント分離用、必須）';
COMMENT ON COLUMN file_metadata.original_filename IS '元のファイル名（アップロード時の名前）';
COMMENT ON COLUMN file_metadata.file_size IS 'ファイルサイズ（バイト単位）';
COMMENT ON COLUMN file_metadata.file_type IS 'MIMEタイプ（例: application/xml）';
COMMENT ON COLUMN file_metadata.uploaded_by IS 'アップロードユーザーID';
COMMENT ON COLUMN file_metadata.created_at IS '作成日時（自動設定）';
COMMENT ON COLUMN file_metadata.updated_at IS '更新日時（トリガーで自動更新）';

-- ============================================================
-- 使用例
-- ============================================================

-- 【例1】ファイルメタデータの登録
-- INSERT INTO file_metadata (
--     file_key,
--     s3_bucket,
--     organization_id,
--     original_filename,
--     file_size,
--     file_type,
--     uploaded_by
-- ) VALUES (
--     'org_maiml_lab_001/projects/sample_project/sample_project.maiml',
--     'mmdpf-files',
--     '550e8400-e29b-41d4-a716-446655440000'::UUID,
--     'sample_project.maiml',
--     1048576,
--     'application/xml',
--     'user_001'
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

-- 【例4】ユーザーがアップロードしたファイル一覧
-- SELECT 
--     file_key,
--     original_filename,
--     file_size,
--     created_at
-- FROM file_metadata 
-- WHERE uploaded_by = 'user_001'
--   AND organization_id = '550e8400-e29b-41d4-a716-446655440000'::UUID
-- ORDER BY created_at DESC;

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

-- 【将来の拡張計画】
-- v2.0: MAIML解析メタデータ追加
--   - maiml_transitions_count INTEGER
--   - maiml_places_count INTEGER
--   - maiml_validation_result JSONB
--   - maiml_analysis_status VARCHAR(20)
--   - maiml_last_analyzed TIMESTAMP
-- 
-- v3.0: アップロード管理追加
--   - upload_batch_id VARCHAR(255)
--   - upload_source VARCHAR(50)
--   - upload_timestamp TIMESTAMP
-- 
-- v4.0以降: 検索・統計・ドラフト管理等を段階的に追加

-- ============================================================
-- 関連ドキュメント
-- ============================================================

-- 詳細仕様: docs/design/db/db_table_list.md
-- 使用方法: docs/design/db/file_metadata_usage.md（作成予定）
-- 調査結果: docs/20260116_1336_file_metadata使用状況調査_結果.md
-- タスク計画: docs/20260116_1320_file_metadata反映_PLAN.md

-- ============================================================
-- 変更履歴
-- ============================================================

-- 2026-01-16: 初版作成（v1.0 - S3アクセス必須9カラム、file_keyを主キーとする自然キー設計）
--   - 主キー: file_key (VARCHAR(500))
--   - インデックス: organization_id, uploaded_by（2個）
--   - トリガー: updated_at自動更新
