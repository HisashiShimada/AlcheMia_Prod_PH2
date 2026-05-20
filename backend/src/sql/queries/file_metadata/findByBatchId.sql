-- バッチIDに紐付けられたファイルメタデータを取得するクエリ
-- $1: upload_batch_id
SELECT *
FROM file_metadata
WHERE upload_batch_id = $1
ORDER BY created_at ASC
