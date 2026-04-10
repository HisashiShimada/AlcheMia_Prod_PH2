-- ============================================================================
-- マイグレーション: transition_set テーブル ベクトル次元変更 768→1024
-- 対象環境: SaaS（AWS Bedrock + cohere.embed-v4:0）のみ
-- 実行条件: EMBEDDING_PROVIDER=bedrock の環境でのみ適用すること
-- ⚠️ オンプレ環境には絶対に適用しないこと（オンプレは768次元のまま）
-- ============================================================================
-- 変更内容:
--   emb_input, emb_transition, emb_output, emb_structure の次元数を
--   VECTOR(768) → VECTOR(1024) に変更する。
--
-- 注意事項:
--   - 既存の768次元データは1024次元カラムに入れられないため削除される
--   - マイグレーション前に必ずバックアップを取得すること
--   - 適用後はバッチインデックス再生成が必要
-- ============================================================================
-- 実行日: 2026-04-10
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: 既存のHNSWインデックスを削除（カラム変更前に必須）
-- ============================================================================
DROP INDEX IF EXISTS ts_emb_input_hnsw;
DROP INDEX IF EXISTS ts_emb_transition_hnsw;
DROP INDEX IF EXISTS ts_emb_output_hnsw;
DROP INDEX IF EXISTS ts_emb_structure_hnsw;

-- ============================================================================
-- Step 2: 既存データを全件削除（768次元データは1024次元カラムに移行不可）
-- ============================================================================
DELETE FROM transition_set;

-- ============================================================================
-- Step 3: ベクトルカラムの次元数を 768 → 1024 に変更
-- ============================================================================
ALTER TABLE transition_set
  ALTER COLUMN emb_input     TYPE VECTOR(1024),
  ALTER COLUMN emb_transition TYPE VECTOR(1024),
  ALTER COLUMN emb_output    TYPE VECTOR(1024),
  ALTER COLUMN emb_structure TYPE VECTOR(1024);

-- ============================================================================
-- Step 4: カラムコメントを更新
-- ============================================================================
COMMENT ON COLUMN transition_set.emb_input      IS '入力ベクトル（1024次元、Bedrock cohere.embed-v4:0）';
COMMENT ON COLUMN transition_set.emb_transition IS '遷移ベクトル（1024次元、Bedrock cohere.embed-v4:0）';
COMMENT ON COLUMN transition_set.emb_output     IS '出力ベクトル（1024次元、Bedrock cohere.embed-v4:0）';
COMMENT ON COLUMN transition_set.emb_structure  IS '構造ベクトル（1024次元、Bedrock cohere.embed-v4:0）';

-- ============================================================================
-- Step 5: HNSWインデックスを1024次元で再作成
-- ============================================================================
CREATE INDEX ts_emb_input_hnsw
  ON transition_set
  USING HNSW (emb_input vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX ts_emb_transition_hnsw
  ON transition_set
  USING HNSW (emb_transition vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX ts_emb_output_hnsw
  ON transition_set
  USING HNSW (emb_output vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX ts_emb_structure_hnsw
  ON transition_set
  USING HNSW (emb_structure vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================================
-- Step 6: テーブルコメントを更新
-- ============================================================================
COMMENT ON TABLE transition_set IS 'セマンティック検索（トランジションセット型）のコアテーブル。検索単位は(organization_id, file_id, method_uuid, transition_id)。4軸ベクトル（input/transition/output/structure）で近傍検索を実施。SaaS環境では1024次元（Bedrock cohere.embed-v4:0）、オンプレ環境では768次元（Ollama embeddinggemma）。';

COMMIT;

-- ============================================================================
-- 適用後の確認クエリ
-- ============================================================================
-- 次元数の確認:
--   SELECT column_name, data_type, udt_name
--   FROM information_schema.columns
--   WHERE table_name = 'transition_set'
--     AND column_name IN ('emb_input', 'emb_transition', 'emb_output', 'emb_structure');
--
-- インデックスの確認:
--   SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE tablename = 'transition_set'
--     AND indexname LIKE '%hnsw%';
--
-- レコード数の確認（0件になっているはず）:
--   SELECT COUNT(*) FROM transition_set;
-- ============================================================================
