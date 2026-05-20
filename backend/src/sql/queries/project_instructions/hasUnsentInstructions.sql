-- 未送信指示の存在確認クエリ（instruction_status = 0 が未送信）
-- $1: organization_id, $2: project_id
SELECT COUNT(*) as count
FROM project_instruction
WHERE organization_id = $1
  AND project_id = $2
  AND instruction_status = 0
