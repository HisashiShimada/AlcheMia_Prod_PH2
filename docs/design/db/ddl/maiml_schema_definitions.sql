-- maiml_schema_definitions.sql
-- MAIMLスキーマ定義テーブル
-- 作成日: 2026-01-27
-- 用途: XSDスキーマ定義の管理とスキーマ参照バリデーション

-- テーブル削除（既存の場合）
DROP TABLE IF EXISTS maiml_schema_definitions CASCADE;

-- テーブル作成
CREATE TABLE maiml_schema_definitions (
    -- 主キー
    schema_version VARCHAR(20) PRIMARY KEY,
    
    -- スキーマ定義本体
    schema_content TEXT NOT NULL,              -- XSDスキーマの全文
    
    -- パース済みメタデータ（JSONB形式）
    schema_parsed_metadata JSONB,              -- パース済みメタデータ
    element_definitions JSONB,                 -- 要素定義
    attribute_definitions JSONB,               -- 属性定義
    datatype_definitions JSONB,                -- データ型定義
    namespace_definitions JSONB,               -- 名前空間定義
    hierarchy_rules JSONB,                     -- 階層ルール
    validation_rules JSONB,                    -- バリデーションルール
    
    -- 状態管理
    is_active BOOLEAN DEFAULT TRUE,
    
    -- タイムスタンプ
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_maiml_schema_version 
    ON maiml_schema_definitions(schema_version);

CREATE INDEX idx_maiml_schema_active 
    ON maiml_schema_definitions(is_active);

-- JSONB検索用インデックス（GIN）
CREATE INDEX idx_maiml_schema_element_definitions 
    ON maiml_schema_definitions USING GIN (element_definitions);

CREATE INDEX idx_maiml_schema_hierarchy_rules 
    ON maiml_schema_definitions USING GIN (hierarchy_rules);

-- テーブルコメント
COMMENT ON TABLE maiml_schema_definitions IS 
    'MAIMLスキーマ定義テーブル。XSDスキーマ定義を管理し、スキーマ参照バリデーションに使用。';

-- カラムコメント
COMMENT ON COLUMN maiml_schema_definitions.schema_version IS 
    'スキーマバージョン（主キー、例: "1.0", "1.1", "2.0"）';

COMMENT ON COLUMN maiml_schema_definitions.schema_content IS 
    'XSDスキーマの全文（TEXT形式）';

COMMENT ON COLUMN maiml_schema_definitions.schema_parsed_metadata IS 
    'パース済みメタデータ（JSONB形式）。スキーマの概要情報。';

COMMENT ON COLUMN maiml_schema_definitions.element_definitions IS 
    '要素定義（JSONB形式）。各XML要素の定義を格納。
    例: {"maiml": {"type": "complex", "required": true}, ...}';

COMMENT ON COLUMN maiml_schema_definitions.attribute_definitions IS 
    '属性定義（JSONB形式）。各要素の属性定義を格納。
    例: {"maiml": [{"name": "version", "type": "string", "required": true}], ...}';

COMMENT ON COLUMN maiml_schema_definitions.datatype_definitions IS 
    'データ型定義（JSONB形式）。カスタムデータ型の定義を格納。';

COMMENT ON COLUMN maiml_schema_definitions.namespace_definitions IS 
    '名前空間定義（JSONB形式）。使用する名前空間を格納。
    例: {"default": "http://www.example.com/maiml", "xsi": "http://www.w3.org/2001/XMLSchema-instance"}';

COMMENT ON COLUMN maiml_schema_definitions.hierarchy_rules IS 
    '階層ルール（JSONB形式）。親子関係の制約を格納。
    例: {"maiml": {"allowedChildren": [{"name": "protocol", "required": true}]}}';

COMMENT ON COLUMN maiml_schema_definitions.validation_rules IS 
    'バリデーションルール（JSONB形式）。追加の検証ルールを格納。';

COMMENT ON COLUMN maiml_schema_definitions.is_active IS 
    'アクティブフラグ（true: 有効、false: 無効）';

COMMENT ON COLUMN maiml_schema_definitions.created_at IS 
    '作成日時';

COMMENT ON COLUMN maiml_schema_definitions.updated_at IS 
    '最終更新日時';

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_maiml_schema_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_maiml_schema_definitions_updated_at
    BEFORE UPDATE ON maiml_schema_definitions
    FOR EACH ROW
    EXECUTE FUNCTION update_maiml_schema_definitions_updated_at();

-- サンプルデータ挿入（初期スキーマ定義）
-- 
-- INSERT INTO maiml_schema_definitions (
--     schema_version,
--     schema_content,
--     element_definitions,
--     namespace_definitions,
--     hierarchy_rules,
--     is_active
-- ) VALUES (
--     '1.0',
--     '<?xml version="1.0" encoding="UTF-8"?>
--      <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
--        <!-- XSD定義 -->
--      </xs:schema>',
--     '{"maiml": {"type": "complex", "required": true}, "protocol": {"type": "complex", "required": true}}',
--     '{"default": "http://www.example.com/maiml"}',
--     '{"maiml": {"allowedChildren": [{"name": "protocol", "required": true}]}}',
--     TRUE
-- );

-- サンプルクエリ
-- 
-- 1. アクティブなスキーマ定義を取得
-- SELECT 
--     schema_version,
--     element_definitions,
--     hierarchy_rules,
--     created_at
-- FROM maiml_schema_definitions
-- WHERE is_active = TRUE
-- ORDER BY schema_version DESC;
-- 
-- 2. 特定バージョンのスキーマ定義を取得
-- SELECT 
--     schema_version,
--     schema_content,
--     schema_parsed_metadata,
--     element_definitions,
--     attribute_definitions,
--     datatype_definitions,
--     namespace_definitions,
--     hierarchy_rules,
--     validation_rules
-- FROM maiml_schema_definitions
-- WHERE schema_version = '1.0' AND is_active = TRUE;
-- 
-- 3. 要素定義の検索（JSONB検索）
-- SELECT 
--     schema_version,
--     element_definitions->'maiml' AS maiml_definition
-- FROM maiml_schema_definitions
-- WHERE element_definitions ? 'maiml'
--   AND is_active = TRUE;