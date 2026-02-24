-- 既確認チェック
-- 使用箇所: instructionRepository.ts - checkAcknowledged()
-- パラメータ: $1=instructionId, $2=projectId, $3=organizationId

SELECT acknowledged_at
FROM instruction_acknowledged_history
WHERE experiment_instruction_id = $1 
  AND project_id = $2
  AND organization_id = $3
ORDER BY acknowledged_at DESC
LIMIT 1
