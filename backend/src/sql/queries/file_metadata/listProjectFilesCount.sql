-- プロジェクト内のファイル総件数を取得するクエリ
-- $1: organization_id, $2: project_path_prefix（LIKE用）
SELECT COUNT(*) as count
FROM file_metadata
WHERE organization_id = $1
  AND object_key LIKE $2
