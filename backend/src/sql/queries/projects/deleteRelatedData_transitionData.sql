-- プロジェクト関連データ削除: transition_data
-- $1: organization_id, $2: project_id
DELETE FROM transition_data
WHERE organization_id = $1
  AND project_id = $2
