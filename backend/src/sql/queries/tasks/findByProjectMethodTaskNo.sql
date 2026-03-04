-- タスク基本情報取得（プロジェクト・メソッド・タスク番号で検索）
-- 
-- Parameters:
--   $1: project_id (UUID)
--   $2: method_id (TEXT)
--   $3: task_no (INTEGER) - project_task_detail.task_no
--   $4: organization_id (UUID) - マルチテナント分離必須
-- 
-- Returns:
--   task_name (project_task.task_name), project_id, project_name, method_id, task_no (project_task_detail.task_no)
--   見つからない場合は0件

SELECT 
  pt.task_name,
  pt.project_id,
  p.project_name,
  pt.method_id,
  ptd.task_no
FROM project_task pt
LEFT JOIN project p ON pt.project_id = p.project_id 
  AND pt.organization_id = p.organization_id
INNER JOIN project_task_detail ptd ON pt.project_id = ptd.project_id
  AND pt.method_id = ptd.method_id
  AND pt.organization_id = ptd.organization_id
WHERE pt.project_id = $1
  AND pt.method_id = $2
  AND ptd.task_no = $3
  AND pt.organization_id = $4
LIMIT 1;
