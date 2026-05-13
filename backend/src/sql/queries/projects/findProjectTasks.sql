-- プロジェクトに紐づくタスク一覧取得（JOIN付き）
-- $1: organization_id
-- $2: project_id
-- 動的WHERE句（タスクステータスフィルタ）はRepository層で付加する
SELECT
  ptd.organization_id,
  ptd.project_id,
  ptd.method_id,
  ptd.task_no,
  ptd.task_status,
  ptd.experiment_start_at,
  ptd.experiment_end_at,
  ptd.experiment_user_id,
  ou.user_name as experiment_user_name,
  ptd.reviewed_at,
  ptd.review_user_id,
  ru.user_name as review_user_name,
  pt_agg.min_experiment_order
FROM project_task_detail ptd
LEFT JOIN (
  SELECT
    organization_id,
    project_id,
    method_id,
    MIN(experiment_order) AS min_experiment_order
  FROM project_task
  GROUP BY organization_id, project_id, method_id
) pt_agg
  ON pt_agg.organization_id = ptd.organization_id
  AND pt_agg.project_id = ptd.project_id
  AND pt_agg.method_id = ptd.method_id
LEFT JOIN organization_user ou
  ON ou.user_id = ptd.experiment_user_id
  AND ou.organization_id = ptd.organization_id
LEFT JOIN organization_user ru
  ON ru.user_id = ptd.review_user_id
  AND ru.organization_id = ptd.organization_id
WHERE ptd.organization_id = $1
  AND ptd.project_id = $2
