-- 未送信指示を一括で送信済に更新するクエリ
-- $1: instruction_user_id, $2: organization_id, $3: project_id
UPDATE project_instruction
SET
  instruction_status = 1,
  instruction_user_id = $1,
  instruction_date = CURRENT_TIMESTAMP,
  update_at = CURRENT_TIMESTAMP
WHERE organization_id = $2
  AND project_id = $3
  AND instruction_status = 0
