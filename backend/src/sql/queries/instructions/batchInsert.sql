-- プロジェクト指示の一括挿入
-- タスク登録タブから指示を保存する際に使用
INSERT INTO project_instruction (
  organization_id,
  project_id,
  experiment_instruction_id,
  method_id,
  instruction_target,
  priority,
  type,
  task_no,
  transition_id,
  instructions,
  instruction_user_id,
  instruction_date,
  instruction_status,
  create_user_id,
  create_at,
  update_user_id,
  update_at
) VALUES (
  $1,  -- organization_id
  $2,  -- project_id
  $3,  -- experiment_instruction_id (instructionId)
  $4,  -- method_id
  $5,  -- instruction_target (targetType)
  $6,  -- priority
  $7,  -- type
  $8,  -- task_no (taskNumber)
  $9,  -- transition_id
  $10, -- instructions (content)
  $11, -- instruction_user_id (userId)
  CURRENT_TIMESTAMP, -- instruction_date
  $12, -- instruction_status (0: 未送信)
  $13, -- create_user_id (userId)
  CURRENT_TIMESTAMP, -- create_at
  $14, -- update_user_id (userId)
  CURRENT_TIMESTAMP  -- update_at
)
