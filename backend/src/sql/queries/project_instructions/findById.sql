-- 指示を1件取得するクエリ
-- $1: organization_id, $2: project_id, $3: experiment_instruction_id
SELECT *
FROM project_instruction
WHERE organization_id = $1
  AND project_id = $2
  AND experiment_instruction_id = $3
