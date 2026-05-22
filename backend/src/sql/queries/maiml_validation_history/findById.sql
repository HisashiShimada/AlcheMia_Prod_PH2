-- バリデーション履歴詳細を取得するクエリ
-- $1: validation_id, $2: organization_id
SELECT *
FROM maiml_validation_history
WHERE validation_id = $1
  AND organization_id = $2
