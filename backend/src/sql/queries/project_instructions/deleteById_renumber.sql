-- 指示IDを再採番するクエリ（削除後の連番詰め）
-- $1: new_experiment_instruction_id, $2: organization_id, $3: project_id, $4: old_experiment_instruction_id
UPDATE project_instruction
SET experiment_instruction_id = $1,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = $2
  AND project_id = $3
  AND experiment_instruction_id = $4
