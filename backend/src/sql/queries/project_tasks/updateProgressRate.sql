-- タスク進捗率更新
-- 指定されたタスクの進捗率を更新（トランジション進捗率の平均値）
UPDATE project_task 
SET progress_rate = $1, 
    updated_at = CURRENT_TIMESTAMP 
WHERE organization_id = $2 
  AND project_id = $3 
  AND method_id = $4 
  AND task_no = $5
