-- トランジションのレコード数取得
-- 指定されたトランジションのデータ件数をカウント
SELECT COUNT(*) as count
FROM transition_data
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
  AND task_no = $4
  AND transition_id = $5
