-- 権限チェック（experiment_worker用）
-- 使用箇所: instructionRepository.ts - checkWorkerAssignment()
-- パラメータ: $1=instructionId, $2=projectId, $3=userId, $4=organizationId

SELECT pt.task_id
FROM project_task pt
INNER JOIN project_instruction pi ON pi.project_id = pt.project_id
WHERE pi.experiment_instruction_id = $1
  AND pi.project_id = $2
  AND pt.worker_user_id = $3
  AND pt.organization_id = $4
  AND pi.organization_id = $4
