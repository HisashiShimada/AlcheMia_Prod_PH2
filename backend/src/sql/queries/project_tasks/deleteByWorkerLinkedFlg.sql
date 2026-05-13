-- worker_linked_flg の値で絞り込んでタスクを削除
-- $1: organization_id
-- $2: project_id
-- $3: worker_linked_flg（削除対象の値）
DELETE FROM project_task
WHERE organization_id = $1 
  AND project_id = $2 
  AND worker_linked_flg = $3
