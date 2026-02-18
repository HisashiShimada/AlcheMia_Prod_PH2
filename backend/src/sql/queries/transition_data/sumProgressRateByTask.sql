-- 進捗率合計取得（タスク単位）
-- 指定されたタスクに紐づく全トランジションの進捗率合計を取得
SELECT COALESCE(SUM(progress_rate), 0) as sum 
FROM transition_data 
WHERE organization_id = $1 
  AND project_id = $2 
  AND method_id = $3 
  AND task_no = $4
