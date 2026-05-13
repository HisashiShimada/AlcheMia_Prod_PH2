-- プロジェクト内の全タスクの worker_linked_flg を更新
-- $1: worker_linked_flg（設定する値）
-- $2: update_user_id（更新ユーザーID）
-- $3: organization_id
-- $4: project_id
UPDATE project_task
SET 
  worker_linked_flg = $1,
  update_user_id = $2,
  update_at = CURRENT_TIMESTAMP
WHERE organization_id = $3 
  AND project_id = $4
