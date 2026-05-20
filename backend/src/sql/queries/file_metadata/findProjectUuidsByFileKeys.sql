-- 指定ファイルキーのproject_uuidを取得するクエリ（重複除去）
-- $1: organization_id, $2: file_keys（text[]型）
SELECT DISTINCT project_uuid
FROM file_metadata
WHERE organization_id = $1
  AND file_key = ANY($2::text[])
  AND project_uuid IS NOT NULL
