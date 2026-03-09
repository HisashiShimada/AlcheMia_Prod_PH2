-- タスク別トランジション進捗取得クエリ
-- 使用箇所:
--   - progressService.ts - getWorkDetails()
-- パラメータ: $1=organizationId, $2=projectId, $3=methodId, $4=taskNo
-- 注意: transition_data に experiment_order カラムは存在しない
--       主キー: (organization_id, project_id, method_id, task_no, transition_id)

SELECT
  td.transition_id,
  td.status,
  td.progress_rate,
  td.update_user_id,
  ou.user_name AS worker_name,
  td.create_at,
  td.update_at
FROM transition_data td
LEFT JOIN organization_user ou
  ON td.update_user_id = ou.user_id
  AND td.organization_id = ou.organization_id
WHERE td.organization_id = $1
  AND td.project_id = $2
  AND td.method_id = $3
  AND td.task_no = $4
ORDER BY td.transition_id ASC
