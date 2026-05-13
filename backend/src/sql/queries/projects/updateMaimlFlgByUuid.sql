-- project_uuid をキーに project_maiml_flg を更新
-- MAIMLファイルが失われた場合に false にセットする
-- $1: project_maiml_flg（設定する値）
-- $2: organization_id
-- $3: project_uuid
UPDATE project
SET project_maiml_flg = $1,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = $2
  AND project_uuid = $3
