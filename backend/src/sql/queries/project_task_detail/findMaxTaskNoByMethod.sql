-- プロジェクト内の特定メソッドの最大task_noを取得
-- method_idごとの最大task_noを返す（レコードが存在しない場合はNULL）
SELECT COALESCE(MAX(task_no), 0) as max_task_no
FROM project_task_detail
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
