-- セマンティック検索クエリ（4軸加重平均スコアリング）
-- 各軸のコサイン類似度を加重平均してスコアを算出し、min_score未満を除外する
-- $1: organization_id (uuid)
-- $2: emb_input (vector文字列)
-- $3: emb_transition (vector文字列)
-- $4: emb_output (vector文字列)
-- $5: emb_structure (vector文字列)
-- $6: weight_input (float)
-- $7: weight_transition (float)
-- $8: weight_output (float)
-- $9: weight_structure (float)
-- $10: top_k (int)
-- $11: technique (text or NULL)
-- $12: project_name (text or NULL)
-- $13: min_score (float) - スコア足切り閾値（デフォルト: 0.3）

SELECT
  transition_set_id,
  organization_id,
  project_name,
  file_id,
  file_path,
  method_uuid,
  transition_id,
  instruction_ids,
  instruction_descs,
  input_text,
  transition_text,
  output_text,
  structure_text,
  technique,
  input_score,
  transition_score,
  output_score,
  structure_score,
  score
FROM (
  SELECT
    transition_set_id,
    organization_id,
    project_name,
    file_id,
    file_path,
    method_uuid,
    transition_id,
    instruction_ids,
    instruction_descs,
    input_text,
    transition_text,
    output_text,
    structure_text,
    technique,
    -- 各軸の類似度（1 - cosine_distance）
    1 - (emb_input <=> $2::vector)    AS input_score,
    1 - (emb_transition <=> $3::vector) AS transition_score,
    1 - (emb_output <=> $4::vector)   AS output_score,
    1 - (emb_structure <=> $5::vector) AS structure_score,
    -- 加重平均スコア
    (
      $6::float * (1 - (emb_input <=> $2::vector)) +
      $7::float * (1 - (emb_transition <=> $3::vector)) +
      $8::float * (1 - (emb_output <=> $4::vector)) +
      $9::float * (1 - (emb_structure <=> $5::vector))
    ) AS score
  FROM transition_set
  WHERE organization_id = $1
    AND ($11::text IS NULL OR technique = $11::text)
    AND ($12::text IS NULL OR project_name = $12::text)
) sub
WHERE sub.score >= $13::float
  AND sub.score != 'NaN'::float  -- NaN 除外（PostgreSQLではNaN >= anyがtrueになるため。NaN!=NaNはfalseなので除外される）
ORDER BY sub.score DESC
LIMIT $10
