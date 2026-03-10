-- プロジェクト内の既存指示数を取得
SELECT COUNT(*) as count
FROM project_instruction
WHERE organization_id = $1
  AND project_id = $2
