-- プロジェクト配下の全ファイルメタデータを取得するクエリ（論理削除除外）
-- $1: organization_id, $2: project_id
SELECT *
FROM file_metadata
WHERE organization_id = $1
  AND project_id = $2
  AND deleted_at IS NULL
ORDER BY object_key
