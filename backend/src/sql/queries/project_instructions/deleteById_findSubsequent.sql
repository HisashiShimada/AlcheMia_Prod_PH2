-- 後続の未送信指示を連番順に取得するクエリ（削除時の再採番用、排他ロック付き）
-- $1: organization_id, $2: project_id
SELECT *
FROM project_instruction
WHERE organization_id = $1
  AND project_id = $2
  AND instruction_status = 0
ORDER BY experiment_instruction_id ASC
FOR UPDATE
