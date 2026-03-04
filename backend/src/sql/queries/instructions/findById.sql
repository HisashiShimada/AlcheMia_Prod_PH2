-- 指示の存在確認（instruction_target等の詳細情報も取得）
-- 使用箇所: instructionRepository.ts - findById()
-- パラメータ: $1=instructionId, $2=projectId, $3=organizationId

SELECT
  experiment_instruction_id AS instruction_id,
  project_id,
  organization_id,
  method_id,
  instruction_target,
  task_no,
  transition_id
FROM project_instruction
WHERE experiment_instruction_id = $1 
  AND project_id = $2
  AND organization_id = $3
