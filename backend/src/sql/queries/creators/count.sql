-- Creatorマスタの件数取得
SELECT COUNT(*) as count
FROM creator
WHERE organization_id = $1
