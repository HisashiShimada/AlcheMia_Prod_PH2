-- 削除対象の指示を取得するクエリ（未送信のみ、排他ロック付き）
-- $1: organization_id, $2: project_id, $3: experiment_instruction_id
SELECT experiment_instruction_id
FROM project_instruction
WHERE organization_id = $1
  AND project_id = $2
  AND experiment_instruction_id = $3
  AND instruction_status = 0
FOR UPDATE
