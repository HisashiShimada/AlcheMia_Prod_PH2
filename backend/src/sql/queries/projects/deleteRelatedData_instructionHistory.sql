-- プロジェクト関連データ削除: instruction_acknowledged_history
-- $1: organization_id, $2: project_id
DELETE FROM instruction_acknowledged_history
WHERE organization_id = $1
  AND project_id = $2
