-- タスク基本情報取得（プロジェクト・メソッド・タスク番号で検索）
-- 
-- Parameters:
--   $1: project_id (UUID)
--   $2: method_id (TEXT)
--   $3: task_no (INTEGER)
--   $4: organization_id (UUID) - マルチテナント分離必須
-- 
-- Returns:
--   task_id, task_name, project_id, project_name, method_id, task_no
--   見つからない場合は0件

SELECT 
  pt.task_id,
  pt.task_name,
  pt.project_id,
  p.project_name,
  pt.method_id,
  pt.task_no
FROM project_task pt
LEFT JOIN project p ON pt.project_id = p.project_id 
  AND pt.organization_id = p.organization_id
WHERE pt.project_id = $1
  AND pt.method_id = $2
  AND pt.task_no = $3
  AND pt.organization_id = $4
LIMIT 1;
