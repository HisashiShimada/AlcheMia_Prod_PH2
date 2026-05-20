-- プロジェクト内のファイル一覧をページネーションで取得するクエリ
-- $1: organization_id, $2: project_path_prefix（LIKE用）, $3: limit, $4: offset
SELECT *
FROM file_metadata
WHERE organization_id = $1
  AND object_key LIKE $2
ORDER BY last_modified DESC
LIMIT $3 OFFSET $4
