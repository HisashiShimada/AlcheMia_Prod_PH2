-- 組織内のバッチ件数を取得するクエリ
-- $1: organization_id
SELECT COUNT(*) as count
FROM upload_batch
WHERE organization_id = $1
