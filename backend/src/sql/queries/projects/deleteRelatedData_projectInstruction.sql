-- プロジェクト関連データ削除: project_instruction
-- $1: organization_id, $2: project_id
DELETE FROM project_instruction
WHERE organization_id = $1
  AND project_id = $2
