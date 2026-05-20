-- バッチIDでバッチを取得するクエリ
-- $1: batch_id
SELECT * FROM upload_batch WHERE batch_id = $1
