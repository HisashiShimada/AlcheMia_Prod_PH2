-- prefix テーブルに対応レコードが存在するか確認（namespace_id も含めて検索）
SELECT 1 FROM prefix
WHERE organization_id = $1 AND namespace_id = $2 AND prefix = $3
LIMIT 1
