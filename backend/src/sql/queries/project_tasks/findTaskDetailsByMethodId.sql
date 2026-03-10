-- メソッド別タスク詳細一覧取得クエリ
-- 使用箇所:
--   - progressService.ts - getWorkDetails()
-- パラメータ: $1=organizationId, $2=projectId, $3=methodId
-- 用途: 指定メソッドに紐づく task_no 一覧を取得し、transition_data の検索に使用する

SELECT
  ptd.organization_id,
  ptd.project_id,
  ptd.method_id,
  ptd.task_no,
  ptd.task_status,
  ptd.experiment_start_at,
  ptd.experiment_end_at,
  ptd.experiment_user_id,
  ptd.create_at,
  ptd.update_at
FROM project_task_detail ptd
WHERE ptd.organization_id = $1
  AND ptd.project_id = $2
  AND ptd.method_id = $3
ORDER BY ptd.task_no ASC
