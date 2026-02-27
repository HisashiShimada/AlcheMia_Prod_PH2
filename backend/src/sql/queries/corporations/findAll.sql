-- Corporation一覧取得クエリ（ベースクエリ）
-- 動的フィルターはTypeScript側で追加
SELECT
  corporation_id,
  corporation_name,
  is_active,
  create_at,
  update_at
FROM corporation
WHERE 1=1
ORDER BY create_at ASC
