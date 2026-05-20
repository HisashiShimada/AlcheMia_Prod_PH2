-- ファイルキーでファイルメタデータを取得するクエリ
-- $1: file_key
SELECT *
FROM file_metadata
WHERE file_key = $1
