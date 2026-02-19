-- タスクの存在確認
-- 
-- Parameters:
--   $1: organization_id (UUID) - 組織ID（マルチテナント分離）
--   $2: project_id (UUID) - プロジェクトID
--   $3: method_id (TEXT) - メソッドID
--   $4: task_no (INTEGER) - タスク番号
-- 
-- Returns:
--   task_no（見つかった場合）、見つからない場合は0件

SELECT 
  task_no 
FROM project_task 
WHERE organization_id = $1 
  AND project_id = $2 
  AND method_id = $3 
  AND task_no = $4;
