-- プロジェクト関連データ削除: maiml_event_log
-- $1: organization_id, $2: project_id
DELETE FROM maiml_event_log
WHERE organization_id = $1
  AND project_id = $2
