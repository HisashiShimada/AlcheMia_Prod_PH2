-- 権限チェック（experiment_worker用）
-- 使用箇所: instructionRepository.ts - checkWorkerAssignment()
-- パラメータ: $1=instructionId, $2=userId, $3=organizationId

SELECT pt.task_id
FROM project_task pt
INNER JOIN project_instruction pi ON pi.project_id = pt.project_id
WHERE pi.instruction_id = $1
  AND pt.worker_user_id = $2
  AND pt.organization_id = $3
  AND pi.organization_id = $3
