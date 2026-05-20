-- 複数ファイルキーでファイルメタデータを一括削除するクエリ
-- $1: file_keys（text[]型）, $2: organization_id
DELETE FROM file_metadata
WHERE file_key IN (
  SELECT * FROM UNNEST($1::text[])
)
AND organization_id = $2
