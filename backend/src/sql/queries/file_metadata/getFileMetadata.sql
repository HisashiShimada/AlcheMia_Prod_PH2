-- ファイル名でファイルメタデータを取得するクエリ
-- $1: organization_id, $2: file_name
SELECT * FROM file_metadata
WHERE organization_id = $1
  AND file_name = $2
LIMIT 1
