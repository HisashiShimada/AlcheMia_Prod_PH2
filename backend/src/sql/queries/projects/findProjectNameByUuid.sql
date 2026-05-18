-- project_uuid が他のプロジェクト（除外プロジェクト以外）に既に登録されているか確認
-- UUID重複チェック用: アップロード先プロジェクト自身は除外する
-- params: $1=organization_id, $2=project_uuid, $3=exclude_project_name
SELECT project_name
FROM project
WHERE organization_id = $1
  AND project_uuid = $2
  AND project_name != $3
LIMIT 1
