-- プロジェクトのタスク一覧取得クエリ
-- 使用箇所:
--   - progressService.ts - getWorkDetails()
-- パラメータ: $1=projectId, $2=organizationId
-- 注意: project_taskテーブルに task_name カラムは存在しない
--       experiment_order をタスクNoとして使用する

SELECT
  pt.organization_id,
  pt.project_id,
  pt.method_id,
  pt.experiment_order,
  pt.experiment_condition,
  pt.attempts_count,
  pt.create_at,
  pt.update_at
FROM project_task pt
WHERE pt.project_id = $1
  AND pt.organization_id = $2
ORDER BY pt.method_id ASC, pt.experiment_order ASC
