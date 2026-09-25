-- Prefix 存在確認クエリ（インポートバリデーション用）
-- 指定された namespace_id（スコープ）配下の prefix テーブルに
-- 指定された prefix が存在するかを確認する
-- 返却行と入力配列を比較することで不存在の prefix を特定できる
--
-- パラメータ:
--   $1  organization_id
--   $2  namespace_id（= uncertainty_criteria の name_space_id）
--   $3  prefix 文字列の配列（例: ARRAY['myComp', 'lab']）
SELECT DISTINCT p.prefix
FROM prefix p
WHERE p.organization_id = $1
  AND p.namespace_id    = $2
  AND p.prefix = ANY($3)
