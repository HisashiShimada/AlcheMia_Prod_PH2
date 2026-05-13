-- project_task_detail: プロジェクト内タスク詳細一覧を取得
-- $1: organization_id
-- $2: project_id
SELECT *
FROM project_task_detail
WHERE organization_id = $1
  AND project_id = $2
ORDER BY method_id ASC, task_no ASC
