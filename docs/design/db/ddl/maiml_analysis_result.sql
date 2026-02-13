-- MaiML Analysis Results テーブル追加スクリプト
-- ローカル開発環境用
-- 作成日: 2025-11-09

-- ============================================
-- MaiML分析結果テーブル
-- ============================================

CREATE TABLE IF NOT EXISTS maiml_analysis_results (
    id SERIAL PRIMARY KEY,
    file_key VARCHAR(500) UNIQUE NOT NULL,
    is_valid BOOLEAN DEFAULT FALSE,
    version VARCHAR(20),
    namespace VARCHAR(255),
    errors JSONB DEFAULT '[]',
    warnings JSONB DEFAULT '[]',
    suggestions JSONB DEFAULT '[]',
    statistics JSONB DEFAULT '{}',
    processing_time INTEGER,
    analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_maiml_analysis_results_file_key ON maiml_analysis_results(file_key);
CREATE INDEX IF NOT EXISTS idx_maiml_analysis_results_is_valid ON maiml_analysis_results(is_valid);
CREATE INDEX IF NOT EXISTS idx_maiml_analysis_results_timestamp ON maiml_analysis_results(analysis_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_maiml_analysis_results_errors_gin ON maiml_analysis_results USING gin(errors);
CREATE INDEX IF NOT EXISTS idx_maiml_analysis_results_warnings_gin ON maiml_analysis_results USING gin(warnings);
CREATE INDEX IF NOT EXISTS idx_maiml_analysis_results_statistics_gin ON maiml_analysis_results USING gin(statistics);