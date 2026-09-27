-- namespace_term 存在確認クエリ（インポートバリデーション用）
-- 指定された namespace_id 配下の namespace_term に
-- "prefix:localname" 形式の用語が存在するかを確認する
-- 存在する用語の qname（prefix:localname）を返す
-- 返却行と入力配列を比較することで不存在の用語を特定できる
--
-- パラメータ:
--   $1  organization_id
--   $2  namespace_id（= uncertainty_criteria の name_space_id）
--   $3  "prefix:localname" 文字列の配列（例: ARRAY['myComp:Temperature', 'lab:Pressure']）
SELECT DISTINCT t.prefix || ':' || t.localname AS qname
FROM namespace_term t
WHERE t.organization_id = $1
  AND t.namespace_id    = $2
  AND (t.prefix || ':' || t.localname) = ANY($3)
