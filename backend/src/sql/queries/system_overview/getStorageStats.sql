-- ストレージ統計取得クエリ
-- organization_idに紐づくファイル数と使用容量をfile_metadataテーブルから集計
-- deleted_at IS NULL で論理削除済みファイルを除外
SELECT
  COUNT(*) AS total_files,
  COALESCE(SUM(file_size), 0) AS total_bytes
FROM file_metadata
WHERE organization_id = $1
  AND deleted_at IS NULL
