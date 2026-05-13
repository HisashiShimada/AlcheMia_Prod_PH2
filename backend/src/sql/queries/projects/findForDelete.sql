-- 削除前チェック用 SELECT FOR UPDATE
-- project_maiml_flg と project_name のみ取得
-- $1: organization_id
-- $2: project_id
SELECT project_maiml_flg, project_name
FROM project
WHERE organization_id = $1
  AND project_id = $2
FOR UPDATE
