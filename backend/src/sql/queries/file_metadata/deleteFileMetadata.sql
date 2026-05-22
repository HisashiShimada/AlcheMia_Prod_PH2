-- ファイルメタデータを物理削除するクエリ（ロールバック用）
-- $1: file_key
DELETE FROM file_metadata
WHERE file_key = $1
