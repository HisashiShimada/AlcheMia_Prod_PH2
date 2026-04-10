-- ============================================================================
-- テーブル名: transition_set (トランジションセット)
-- 説明: セマンティック検索（トランジションセット型）のコアテーブル
-- バージョン: 1.1 (2026-04-10)
-- 依存: pgvector拡張が有効化されていること
-- ============================================================================
-- 検索単位: (organization_id, file_id, method_uuid, transition_id) = 1トランジションセット
-- ============================================================================
-- ⚠️ 環境によってベクトル次元数が異なります ⚠️
-- ----------------------------------------------------------------------------
-- オンプレ環境 (EMBEDDING_PROVIDER=ollama):
--   ベクトル: 4軸 × 768次元 (Ollama embeddinggemma:latest)
--   このDDLファイルはオンプレ用（768次元）を定義しています
--
-- SaaS環境 (EMBEDDING_PROVIDER=bedrock):
--   ベクトル: 4軸 × 1024次元 (AWS Bedrock cohere.embed-v4:0)
--   SaaS環境では以下のマイグレーションを適用してください:
--   backend/migrations/20260410_alter_transition_set_vector_1024.sql
-- ============================================================================

-- pgvector拡張の有効化（必須）
CREATE EXTENSION IF NOT EXISTS vector;

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS transition_set CASCADE;

CREATE TABLE transition_set (
    -- ========================================
    -- 主キー
    -- ========================================
    transition_set_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================
    -- マルチテナント分離
    -- ========================================
    organization_id UUID NOT NULL,

    -- ========================================
    -- プロジェクト特定用
    -- S3パス（{org_id}/projects/{project_name}/...）から抽出
    -- formatsフォルダ等、プロジェクト配下でないファイルはNULL
    -- ========================================
    project_name TEXT NULL,

    -- ========================================
    -- 検索単位の識別子（file + method + transition）
    -- ========================================
    file_id UUID NOT NULL,
    file_path TEXT NOT NULL,
    method_uuid UUID NOT NULL,
    transition_id TEXT NOT NULL,

    -- ========================================
    -- Instruction（手順書）- transitionRefで紐づく
    -- ========================================
    instruction_ids TEXT[] NULL,
    instruction_descs TEXT[] NULL,

    -- ========================================
    -- PNML arc由来の入出力place
    -- Input places: arc.source=place AND arc.target=transition
    -- Output places: arc.source=transition AND arc.target=place
    -- ========================================
    input_place_ids TEXT[] NOT NULL DEFAULT '{}',
    output_place_ids TEXT[] NOT NULL DEFAULT '{}',
    input_place_count INT NOT NULL DEFAULT 0,
    output_place_count INT NOT NULL DEFAULT 0,

    -- ========================================
    -- 正規化テキスト（4軸）
    -- ========================================
    input_text TEXT NOT NULL DEFAULT '',
    transition_text TEXT NOT NULL DEFAULT '',
    output_text TEXT NOT NULL DEFAULT '',
    structure_text TEXT NOT NULL DEFAULT '',

    -- ========================================
    -- 実験構造カウント（フィルタ用・任意）
    -- ========================================
    input_mt_count INT NULL,
    input_ct_count INT NULL,
    input_rt_count INT NULL,
    output_mt_count INT NULL,
    output_ct_count INT NULL,
    output_rt_count INT NULL,

    -- ========================================
    -- 4軸ベクトル（EmbeddingGemma 768次元）
    -- ========================================
    emb_input VECTOR(768) NOT NULL,
    emb_transition VECTOR(768) NOT NULL,
    emb_output VECTOR(768) NOT NULL,
    emb_structure VECTOR(768) NOT NULL,

    -- ========================================
    -- メタデータ
    -- ========================================
    technique TEXT NULL,
    embedding_model_version TEXT NOT NULL DEFAULT 'embeddinggemma-768d-v1',
    norm_template_version TEXT NOT NULL DEFAULT 'v2.5',

    -- ========================================
    -- タイムスタンプ
    -- ========================================
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- ========================================
    -- ユニーク制約（検索単位の一意性保証）
    -- ========================================
    CONSTRAINT uq_transition_set_key UNIQUE (organization_id, file_id, method_uuid, transition_id)
);

-- ============================================================================
-- インデックス作成
-- ============================================================================

-- organization_id検索用（マルチテナント分離）
CREATE INDEX idx_ts_organization_id ON transition_set(organization_id);

-- file_id検索用（ファイル単位グルーピング）
CREATE INDEX idx_ts_file_id ON transition_set(file_id);

-- method_uuid検索用
CREATE INDEX idx_ts_method_uuid ON transition_set(method_uuid);

-- updated_at検索用（バッチ処理・増分更新）
CREATE INDEX idx_ts_updated_at ON transition_set(updated_at);

-- プロジェクト単位絞り込み検索用
CREATE INDEX idx_ts_org_project ON transition_set(organization_id, project_name);

-- technique検索用（メソドロジーフィルタ）
CREATE INDEX idx_ts_technique ON transition_set(technique);

-- HNSWベクトルインデックス（セマンティック検索用）
-- 索引方式: HNSW (Hierarchical Navigable Small World)
-- 距離関数: cosine similarity (vector_cosine_ops)
-- m=16: グラフの最大接続数（デフォルト値）
-- ef_construction=64: 構築時の探索幅（デフォルト値）

-- Input Vector用HNSWインデックス（入力条件検索）
CREATE INDEX ts_emb_input_hnsw
ON transition_set
USING HNSW (emb_input vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Transition Vector用HNSWインデックス（手順検索）
CREATE INDEX ts_emb_transition_hnsw
ON transition_set
USING HNSW (emb_transition vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Output Vector用HNSWインデックス（出力要求検索）
CREATE INDEX ts_emb_output_hnsw
ON transition_set
USING HNSW (emb_output vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Structure Vector用HNSWインデックス（実験構造検索）
CREATE INDEX ts_emb_structure_hnsw
ON transition_set
USING HNSW (emb_structure vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- テーブル・カラムコメント
-- ============================================================================

COMMENT ON TABLE transition_set IS 'セマンティック検索（トランジションセット型）のコアテーブル。検索単位は(organization_id, file_id, method_uuid, transition_id)。4軸ベクトル（input/transition/output/structure）で近傍検索を実施。';

COMMENT ON COLUMN transition_set.transition_set_id IS '主キー（UUID）';
COMMENT ON COLUMN transition_set.organization_id IS '組織ID（マルチテナント分離用、NOT NULL）';
COMMENT ON COLUMN transition_set.project_name IS 'プロジェクト名（S3パスから抽出、NULL許容）';
COMMENT ON COLUMN transition_set.file_id IS 'MAIMLファイルの識別子（ファイルパスから生成したUUID）';
COMMENT ON COLUMN transition_set.file_path IS 'ストレージ上のMAIMLファイルパス（organization_id省略の相対パス）';
COMMENT ON COLUMN transition_set.method_uuid IS 'method要素のUUID';
COMMENT ON COLUMN transition_set.transition_id IS 'PNML transition要素のID';
COMMENT ON COLUMN transition_set.instruction_ids IS 'Instruction IDリスト（transitionRefで紐づく）';
COMMENT ON COLUMN transition_set.instruction_descs IS 'Instruction説明リスト';
COMMENT ON COLUMN transition_set.input_place_ids IS '入力プレースIDリスト（arc.source=place AND arc.target=transition）';
COMMENT ON COLUMN transition_set.output_place_ids IS '出力プレースIDリスト（arc.source=transition AND arc.target=place）';
COMMENT ON COLUMN transition_set.input_place_count IS '入力プレース数';
COMMENT ON COLUMN transition_set.output_place_count IS '出力プレース数';
COMMENT ON COLUMN transition_set.input_text IS '入力正規化テキスト（ベクトル化元）';
COMMENT ON COLUMN transition_set.transition_text IS 'トランジション正規化テキスト（ベクトル化元）';
COMMENT ON COLUMN transition_set.output_text IS '出力正規化テキスト（ベクトル化元）';
COMMENT ON COLUMN transition_set.structure_text IS '構造正規化テキスト（ベクトル化元）';
COMMENT ON COLUMN transition_set.input_mt_count IS '入力Materialテンプレート数（フィルタ用）';
COMMENT ON COLUMN transition_set.input_ct_count IS '入力Conditionテンプレート数（フィルタ用）';
COMMENT ON COLUMN transition_set.input_rt_count IS '入力Resultテンプレート数（フィルタ用）';
COMMENT ON COLUMN transition_set.output_mt_count IS '出力Materialテンプレート数（フィルタ用）';
COMMENT ON COLUMN transition_set.output_ct_count IS '出力Conditionテンプレート数（フィルタ用）';
COMMENT ON COLUMN transition_set.output_rt_count IS '出力Resultテンプレート数（フィルタ用）';
COMMENT ON COLUMN transition_set.emb_input IS '入力ベクトル（768次元、EmbeddingGemma）';
COMMENT ON COLUMN transition_set.emb_transition IS '遷移ベクトル（768次元、EmbeddingGemma）';
COMMENT ON COLUMN transition_set.emb_output IS '出力ベクトル（768次元、EmbeddingGemma）';
COMMENT ON COLUMN transition_set.emb_structure IS '構造ベクトル（768次元、EmbeddingGemma）';
COMMENT ON COLUMN transition_set.technique IS '分析手法コード（RAMAN, XRF, GC-MS等）。スコアブースト+0.3 / ミスマッチペナルティ-0.5';
COMMENT ON COLUMN transition_set.embedding_model_version IS '埋め込みモデルバージョン';
COMMENT ON COLUMN transition_set.norm_template_version IS '正規化テンプレートバージョン';
COMMENT ON COLUMN transition_set.updated_at IS 'レコード更新日時';
