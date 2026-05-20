-- アップロードバッチを作成するクエリ
-- $1: batch_id, $2: batch_name, $3: upload_type, $4: organization_id, $5: upload_by, $6: total_files
INSERT INTO upload_batch (
  batch_id, batch_name, upload_type, organization_id,
  upload_by, total_files, status, start_time, create_at, update_at
)
VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', NOW(), NOW(), NOW())
RETURNING *
