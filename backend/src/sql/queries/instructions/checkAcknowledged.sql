-- 既確認チェック
-- 使用箇所: instructionRepository.ts - checkAcknowledged()
-- パラメータ: $1=instructionId, $2=organizationId

SELECT history_id, acknowledged_at
FROM instruction_acknowledged_history
WHERE instruction_id = $1 
  AND organization_id = $2
ORDER BY acknowledged_at DESC
LIMIT 1
