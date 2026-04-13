-- プロジェクトUUIDからMAIMLファイルのfile_keyを取得
-- project.project_uuidと紐付けられた最新のMAIMLファイルを返す
SELECT file_key, original_filename
FROM file_metadata
WHERE project_uuid = $1
  AND is_maiml_file = true
ORDER BY updated_at DESC
LIMIT 1
