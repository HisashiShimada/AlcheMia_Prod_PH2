-- template_data プロジェクト全件取得
-- 実験指示一覧表示用（method_id / task_no / place_id 順に返す）
--
-- $1: organization_id
-- $2: project_id
SELECT
  organization_id,
  project_id,
  method_id,
  task_no,
  place_id,
  property_set,
  create_user_id,
  update_user_id,
  create_at,
  update_at
FROM template_data
WHERE organization_id = $1
  AND project_id      = $2
ORDER BY method_id, task_no, place_id
