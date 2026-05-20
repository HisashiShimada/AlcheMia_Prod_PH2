-- プロジェクト名からMAIMLファイルのfile_keyを取得（project_uuidが未設定の場合のフォールバック）
-- organization_idとproject_nameで絞り込み、最新のMAIMLファイルを返す
SELECT file_key, original_filename, project_uuid
FROM file_metadata
WHERE organization_id = $1
  AND project_name = $2
  AND is_maiml_file = true
  AND deleted_at IS NULL
ORDER BY updated_at DESC
LIMIT 1
