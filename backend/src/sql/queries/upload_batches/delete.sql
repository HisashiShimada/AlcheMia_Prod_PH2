-- バッチIDでバッチを削除するクエリ
-- $1: batch_id
DELETE FROM upload_batch WHERE batch_id = $1
