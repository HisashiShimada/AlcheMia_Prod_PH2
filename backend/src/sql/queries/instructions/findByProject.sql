-- プロジェクトの全指示を取得（プロジェクト指示 + タスク指示）
-- バリデーション用に使用
-- method_idがNULLの場合は空文字列に変換（プロジェクト指示として扱う）
SELECT 
  experiment_instruction_id as instruction_id,
  organization_id,
  project_id,
  COALESCE(method_id, '') as method_id,
  priority,
  type,
  task_no,
  transition_id,
  instructions as content,
  instruction_status,
  create_at,
  create_user_id,
  update_at,
  update_user_id
FROM project_instruction
WHERE organization_id = $1
  AND project_id = $2
  AND instruction_status = 0
ORDER BY create_at DESC
