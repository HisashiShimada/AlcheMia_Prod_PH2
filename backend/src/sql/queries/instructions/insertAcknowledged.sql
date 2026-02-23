-- 確認履歴の挿入
-- 使用箇所: instructionRepository.ts - insertAcknowledged()
-- パラメータ: $1=instructionId, $2=userId, $3=organizationId

INSERT INTO instruction_acknowledged_history (
  instruction_id,
  acknowledged_user_id,
  acknowledged_at,
  organization_id
) VALUES ($1, $2, NOW(), $3)
RETURNING history_id, acknowledged_at
