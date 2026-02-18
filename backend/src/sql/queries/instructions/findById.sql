-- 指示の存在確認
-- 使用箇所: instructionRepository.ts - findById()
-- パラメータ: $1=instructionId, $2=organizationId

SELECT instruction_id, organization_id
FROM project_instruction
WHERE instruction_id = $1 
  AND organization_id = $2
