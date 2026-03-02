-- ============================================================================
-- Migration: transition_set テーブル作成（セマンティック検索）
-- ============================================================================
-- 目的: セマンティック検索（トランジションセット型検索）のコアテーブルを作成
-- 流用元: semantic_search/database/migrations/053_create_maiml_transition_set_table.sql
-- 現プロジェクト追加カラム: organization_id（NOT NULL）、project_name（NULL許容）
-- 検索単位: (file_id, method_uuid, transition_id) = 1トランジションセット
-- ベクトル: 4軸（input/transition/output/structure）× 768次元（EmbeddingGemma）
-- ============================================================================

BEGIN;

-- ============================================================================
-- pgvector拡張の有効化（必須）
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- transition_set テーブル作成
-- ============================================================================
CREATE TABLE IF NOT EXISTS transition_set (
  -- ========================================
  -- 主キー
  -- ========================================
  transition_set_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ========================================
  -- マルチテナント分離（現プロジェクト追加）
  -- ========================================
  organization_id uuid NOT NULL,

  -- ========================================
  -- プロジェクト特定用（現プロジェクト追加）
  -- S3パス（{org_id}/projects/{project_name}/...）から抽出
  -- formatsフォルダ等、プロジェクト配下でないファイルはNULL
  -- ========================================
  project_name text NULL,

  -- ========================================
  -- 検索単位の識別子（file + method + transition）
  -- ========================================
  file_id uuid NOT NULL,
  file_path text NOT NULL,
  method_uuid uuid NOT NULL,
  transition_id text NOT NULL,

  -- ========================================
  -- Instruction（手順書）- transitionRefで紐づく
  -- ========================================
  instruction_ids text[] NULL,
  instruction_descs text[] NULL,

  -- ========================================
  -- PNML arc由来の入出力place
  -- Input places: arc.source=place AND arc.target=transition
  -- Output places: arc.source=transition AND arc.target=place
  -- ========================================
  input_place_ids text[] NOT NULL DEFAULT '{}',
  output_place_ids text[] NOT NULL DEFAULT '{}',
  input_place_count int NOT NULL DEFAULT 0,
  output_place_count int NOT NULL DEFAULT 0,

  -- ========================================
  -- 正規化テキスト（4軸）
  -- ========================================
  input_text text NOT NULL DEFAULT '',
  transition_text text NOT NULL DEFAULT '',
  output_text text NOT NULL DEFAULT '',
  structure_text text NOT NULL DEFAULT '',

  -- ========================================
  -- 実験構造カウント（フィルタ用・任意）
  -- ========================================
  input_mt_count int NULL,
  input_ct_count int NULL,
  input_rt_count int NULL,
  output_mt_count int NULL,
  output_ct_count int NULL,
  output_rt_count int NULL,

  -- ========================================
  -- 4軸ベクトル（EmbeddingGemma 768次元）
  -- ========================================
  emb_input vector(768) NOT NULL,
  emb_transition vector(768) NOT NULL,
  emb_output vector(768) NOT NULL,
  emb_structure vector(768) NOT NULL,

  -- ========================================
  -- メタデータ
  -- ========================================
  technique text NULL,
  embedding_model_version text NOT NULL DEFAULT 'embeddinggemma-768d-v1',
  norm_template_version text NOT NULL DEFAULT 'v2.5',

  -- ========================================
  -- タイムスタンプ
  -- ========================================
  updated_at timestamptz DEFAULT now(),

  -- ========================================
  -- ユニーク制約（検索単位の一意性保証）
  -- ========================================
  UNIQUE (organization_id, file_id, method_uuid, transition_id)
);

-- ============================================================================
-- インデックス作成
-- ============================================================================

-- organization_id検索用（マルチテナント分離）
CREATE INDEX IF NOT EXISTS idx_ts_organization_id ON transition_set(organization_id);

-- file_id検索用（ファイル単位グルーピング）
CREATE INDEX IF NOT EXISTS idx_ts_file_id ON transition_set(file_id);

-- method_uuid検索用
CREATE INDEX IF NOT EXISTS idx_ts_method_uuid ON transition_set(method_uuid);

-- updated_at検索用（バッチ処理・増分更新）
CREATE INDEX IF NOT EXISTS idx_ts_updated_at ON transition_set(updated_at);

-- プロジェクト単位絞り込み検索用（現プロジェクト追加）
CREATE INDEX IF NOT EXISTS idx_ts_org_project ON transition_set(organization_id, project_name);

-- technique検索用（メソドロジーフィルタ）
CREATE INDEX IF NOT EXISTS idx_ts_technique ON transition_set(technique);

-- ============================================================================
-- コメント追加
-- ============================================================================
COMMENT ON TABLE transition_set IS 'セマンティック検索（トランジションセット型）のコアテーブル。検索単位は(organization_id, file_id, method_uuid, transition_id)。4軸ベクトル（input/transition/output/structure）で近傍検索を実施。';
COMMENT ON COLUMN transition_set.transition_set_id IS '主キー（UUID）';
COMMENT ON COLUMN transition_set.organization_id IS '組織ID（マルチテナント分離用、NOT NULL）';
COMMENT ON COLUMN transition_set.project_name IS 'プロジェクト名（S3パスから抽出、NULL許容）';
COMMENT ON COLUMN transition_set.file_id IS 'MAIMLファイルの識別子（ファイルパスから生成したUUID）';
COMMENT ON COLUMN transition_set.file_path IS 'ストレージ上のMAIMLファイルパス（organization_id省略の相対パス）';
COMMENT ON COLUMN transition_set.method_uuid IS 'method要素のUUID';
COMMENT ON COLUMN transition_set.transition_id IS 'PNML transition要素のID';
COMMENT ON COLUMN transition_set.emb_input IS '入力ベクトル（768次元、EmbeddingGemma）';
COMMENT ON COLUMN transition_set.emb_transition IS '遷移ベクトル（768次元、EmbeddingGemma）';
COMMENT ON COLUMN transition_set.emb_output IS '出力ベクトル（768次元、EmbeddingGemma）';
COMMENT ON COLUMN transition_set.emb_structure IS '構造ベクトル（768次元、EmbeddingGemma）';
COMMENT ON COLUMN transition_set.technique IS '分析手法コード（RAMAN, XRF, GC-MS等）。スコアブースト+0.3 / ミスマッチペナルティ-0.5';

COMMIT;
