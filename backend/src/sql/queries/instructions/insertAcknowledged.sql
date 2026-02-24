-- 確認履歴の挿入
-- 使用箇所: instructionRepository.ts - insertAcknowledged()
-- パラメータ: $1=instructionId, $2=projectId, $3=userId, $4=organizationId

INSERT INTO instruction_acknowledged_history (
  experiment_instruction_id,
  project_id,
  experiment_user_id,
  organization_id,
  acknowledged_at
) VALUES ($1, $2, $3, $4, NOW())
RETURNING acknowledged_at
