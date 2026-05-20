-- 指示を削除するクエリ（未送信のみ）
-- $1: organization_id, $2: project_id, $3: experiment_instruction_id
DELETE FROM project_instruction
WHERE organization_id = $1
  AND project_id = $2
  AND experiment_instruction_id = $3
  AND instruction_status = 0
