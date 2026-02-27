-- Corporation 1件取得クエリ
-- corporation_idでフィルタリングして1件取得
SELECT
  corporation_id,
  corporation_name,
  is_active,
  create_at,
  update_at
FROM corporation
WHERE corporation_id = $1
