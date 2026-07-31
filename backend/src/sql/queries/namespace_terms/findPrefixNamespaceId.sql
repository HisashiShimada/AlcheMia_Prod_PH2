-- prefix に対応する namespace_id を取得
SELECT namespace_id FROM prefix
WHERE organization_id = $1 AND prefix = $2
LIMIT 1
