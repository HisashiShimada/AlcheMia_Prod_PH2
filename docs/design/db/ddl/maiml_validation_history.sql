-- maiml_validation_history.sql
-- MAIMLバリデーション履歴テーブル
-- 作成日: 2026-01-27
-- 用途: MAIMLバリデーション実行履歴の保存と監査証跡

-- テーブル削除（既存の場合）
DROP TABLE IF EXISTS maiml_validation_history CASCADE;

-- テーブル作成
CREATE TABLE maiml_validation_history (
    -- 主キー
    validation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 組織・プロジェクト情報
    organization_id UUID NOT NULL,
    project_id character varying(20),
    file_key VARCHAR(500),
    
    -- ユーザー情報
    user_id UUID NOT NULL,
    
    -- バリデーション設定
    validation_mode VARCHAR(20) NOT NULL,      -- basic, full
    
    -- バリデーション結果
    is_valid BOOLEAN NOT NULL,
    total_errors INTEGER NOT NULL DEFAULT 0,
    total_warnings INTEGER NOT NULL DEFAULT 0,
    
    -- エラー・警告詳細（JSONB形式）
    error_details JSONB,                       -- エラー詳細の配列
    warning_details JSONB,                     -- 警告詳細の配列
    
    -- パフォーマンス情報
    validation_duration_ms INTEGER,
    
    -- 検証統計
    elements_validated INTEGER,
    attributes_validated INTEGER,
    nodes_validated INTEGER,
    arcs_validated INTEGER,
    
    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_maiml_validation_history_org_id 
    ON maiml_validation_history(organization_id);

CREATE INDEX idx_maiml_validation_history_project_id 
    ON maiml_validation_history(project_id);

CREATE INDEX idx_maiml_validation_history_user_id 
    ON maiml_validation_history(user_id);

CREATE INDEX idx_maiml_validation_history_file_key 
    ON maiml_validation_history(file_key);

CREATE INDEX idx_maiml_validation_history_created_at 
    ON maiml_validation_history(created_at);

CREATE INDEX idx_maiml_validation_history_is_valid 
    ON maiml_validation_history(is_valid);

-- JSONB検索用インデックス（GIN）
CREATE INDEX idx_maiml_validation_history_error_details 
    ON maiml_validation_history USING GIN (error_details);

CREATE INDEX idx_maiml_validation_history_warning_details 
    ON maiml_validation_history USING GIN (warning_details);

-- テーブルコメント
COMMENT ON TABLE maiml_validation_history IS 
    'MAIMLバリデーション履歴テーブル。バリデーション実行結果を保存し、監査証跡として活用。';

-- カラムコメント
COMMENT ON COLUMN maiml_validation_history.validation_id IS 
    'バリデーションID（UUID、主キー）';

COMMENT ON COLUMN maiml_validation_history.organization_id IS 
    '組織ID（マルチテナント分離用）';

COMMENT ON COLUMN maiml_validation_history.project_id IS 
    'プロジェクトID（任意）';

COMMENT ON COLUMN maiml_validation_history.file_key IS 
    'S3/Swiftファイルキー（任意）';

COMMENT ON COLUMN maiml_validation_history.user_id IS 
    'バリデーション実行ユーザーID';

COMMENT ON COLUMN maiml_validation_history.validation_mode IS 
    'バリデーションモード（basic: 基本チェック、full: 完全チェック）';

COMMENT ON COLUMN maiml_validation_history.is_valid IS 
    'バリデーション結果（true: 妥当、false: エラーあり）';

COMMENT ON COLUMN maiml_validation_history.total_errors IS 
    'エラー総数';

COMMENT ON COLUMN maiml_validation_history.total_warnings IS 
    '警告総数';

COMMENT ON COLUMN maiml_validation_history.error_details IS 
    'エラー詳細（JSONB配列形式）。各エラーの種類、重要度、メッセージ、xpathなどを格納。';

COMMENT ON COLUMN maiml_validation_history.warning_details IS 
    '警告詳細（JSONB配列形式）。各警告の種類、重要度、メッセージ、xpathなどを格納。';

COMMENT ON COLUMN maiml_validation_history.validation_duration_ms IS 
    'バリデーション処理時間（ミリ秒）';

COMMENT ON COLUMN maiml_validation_history.elements_validated IS 
    '検証した要素数';

COMMENT ON COLUMN maiml_validation_history.attributes_validated IS 
    '検証した属性数';

COMMENT ON COLUMN maiml_validation_history.nodes_validated IS 
    '検証したPetri Netノード数';

COMMENT ON COLUMN maiml_validation_history.arcs_validated IS 
    '検証したPetri Netアーク数';

COMMENT ON COLUMN maiml_validation_history.created_at IS 
    'バリデーション実行日時';

-- サンプルクエリ
-- 
-- 1. 組織別バリデーション履歴取得
-- SELECT * FROM maiml_validation_history
-- WHERE organization_id = 'org_uuid'
-- ORDER BY created_at DESC
-- LIMIT 100;
-- 
-- 2. エラー発生率の集計
-- SELECT 
--     DATE_TRUNC('day', created_at) AS date,
--     COUNT(*) AS total_validations,
--     SUM(CASE WHEN is_valid THEN 0 ELSE 1 END) AS failed_validations,
--     ROUND(AVG(validation_duration_ms), 2) AS avg_duration_ms
-- FROM maiml_validation_history
-- WHERE organization_id = 'org_uuid'
-- GROUP BY DATE_TRUNC('day', created_at)
-- ORDER BY date DESC;
-- 
-- 3. 頻出エラーの分析
-- SELECT 
--     jsonb_array_elements(error_details)->>'type' AS error_type,
--     COUNT(*) AS occurrence_count
-- FROM maiml_validation_history
-- WHERE organization_id = 'org_uuid' AND NOT is_valid
-- GROUP BY error_type
-- ORDER BY occurrence_count DESC;