-- プロジェクト指示の一括挿入
-- タスク登録タブから指示を保存する際に使用
INSERT INTO project_instruction (
  organization_id,
  project_id,
  experiment_instruction_id,
  method_id,
  task_no,
  transition_id,
  instructions,
  instruction_user_id,
  instruction_date,
  instruction_status,
  create_user_id,
  create_at,
  update_user_id,
  update_at,
  instruction_key
) VALUES (
  $1,  -- organization_id
  $2,  -- project_id
  $3,  -- experiment_instruction_id (instructionId)
  $4,  -- method_id
  $5,  -- task_no (taskNumber)
  $6,  -- transition_id
  $7,  -- instructions (content)
  $8,  -- instruction_user_id (userId)
  CURRENT_TIMESTAMP, -- instruction_date
  $9,  -- instruction_status (0: 未送信)
  $10, -- create_user_id (userId)
  CURRENT_TIMESTAMP, -- create_at
  $11, -- update_user_id (userId)
  CURRENT_TIMESTAMP, -- update_at
  $12  -- instruction_key (MAIMLのpropertyタグキー。NULLはキー指定なし)
)
