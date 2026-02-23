-- トランジション情報取得（ProgressService.updateTransitionStatus用）
-- 指定されたトランジションのmethod_id, task_no, statusを取得
SELECT method_id, task_no, status 
FROM transition_data 
WHERE organization_id = $1 
  AND project_id = $2 
  AND method_id = $3 
  AND transition_id = $4
