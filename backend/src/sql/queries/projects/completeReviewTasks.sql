-- レビュー待ちタスク（task_status=2）を完了（task_status=3）に一括更新
-- $1: organization_id
-- $2: project_id
UPDATE project_task_detail
SET task_status = 3,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = $1
  AND project_id = $2
  AND task_status = 2
