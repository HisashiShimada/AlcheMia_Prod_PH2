-- バッチ進捗を取得するクエリ（進捗率の計算を含む）
-- $1: batch_id
SELECT
  batch_id,
  batch_name,
  total_files,
  completed_files,
  failed_files,
  status,
  ROUND(
    CASE
      WHEN total_files > 0 THEN (completed_files::NUMERIC / total_files * 100)
      ELSE 0
    END,
    2
  ) as progress_percent
FROM upload_batch
WHERE batch_id = $1
