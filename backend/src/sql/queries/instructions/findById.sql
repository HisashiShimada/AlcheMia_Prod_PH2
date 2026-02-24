-- 指示の存在確認
-- 使用箇所: instructionRepository.ts - findById()
-- パラメータ: $1=instructionId, $2=projectId, $3=organizationId

SELECT experiment_instruction_id as instruction_id, project_id, organization_id
FROM project_instruction
WHERE experiment_instruction_id = $1 
  AND project_id = $2
  AND organization_id = $3
