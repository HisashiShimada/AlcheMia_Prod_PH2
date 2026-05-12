-- プロジェクト内の指定ステータスのタスクを一括ステータス更新
-- $1: task_status（変更先ステータス）
-- $2: update_user_id（更新ユーザーID）
-- $3: organization_id
-- $4: project_id
-- $5: task_status（変更元ステータス）
UPDATE project_task_detail
SET
  task_status = $1,
  update_user_id = $2,
  update_at = CURRENT_TIMESTAMP
WHERE organization_id = $3
  AND project_id = $4
  AND task_status = $5
