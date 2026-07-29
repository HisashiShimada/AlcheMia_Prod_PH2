-- prefix テーブルに対応レコードが存在するか確認
SELECT 1 FROM prefix
WHERE organization_id = $1 AND prefix = $2
LIMIT 1
