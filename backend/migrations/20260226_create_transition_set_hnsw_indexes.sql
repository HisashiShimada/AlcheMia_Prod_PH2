-- ============================================================================
-- Migration: transition_set HNSWベクトルインデックス作成
-- ============================================================================
-- 目的: セマンティック検索の4軸ベクトルに対するHNSWインデックスを作成
-- 流用元: semantic_search/database/migrations/054_create_maiml_transition_set_hnsw_indexes.sql
-- 依存: 20260226_create_transition_set_table.sql
-- 索引方式: HNSW (Hierarchical Navigable Small World)
-- 距離関数: cosine similarity (vector_cosine_ops)
-- ============================================================================
-- HNSWパラメータ:
--   m=16              グラフの最大接続数（デフォルト値）
--   ef_construction=64 構築時の探索幅（デフォルト値）
-- ============================================================================

BEGIN;

-- Input Vector用HNSWインデックス（入力条件検索）
CREATE INDEX IF NOT EXISTS ts_emb_input_hnsw
ON transition_set
USING hnsw (emb_input vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Transition Vector用HNSWインデックス（手順検索）
CREATE INDEX IF NOT EXISTS ts_emb_transition_hnsw
ON transition_set
USING hnsw (emb_transition vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Output Vector用HNSWインデックス（出力要求検索）
CREATE INDEX IF NOT EXISTS ts_emb_output_hnsw
ON transition_set
USING hnsw (emb_output vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Structure Vector用HNSWインデックス（実験構造検索）
CREATE INDEX IF NOT EXISTS ts_emb_structure_hnsw
ON transition_set
USING hnsw (emb_structure vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- インデックス統計を更新（検索最適化）
ANALYZE transition_set;

COMMIT;
