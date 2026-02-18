-- トランジション数カウント（タスク単位）
-- 指定されたタスクに紐づくトランジションの総数を取得
SELECT COUNT(*) as count 
FROM transition_data 
WHERE organization_id = $1 
  AND project_id = $2 
  AND method_id = $3 
  AND task_no = $4
