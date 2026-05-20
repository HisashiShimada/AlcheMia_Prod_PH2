-- ファイルキーでファイルメタデータを削除するクエリ
-- $1: organization_id, $2: file_key
DELETE FROM file_metadata
WHERE organization_id = $1
  AND file_key = $2
