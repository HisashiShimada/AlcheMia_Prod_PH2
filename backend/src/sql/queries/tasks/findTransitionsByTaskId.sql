-- タスクに紐づくトランジション進捗一覧取得クエリ
--
-- Parameters:
--   $1: project_id      (VARCHAR) - プロジェクトID
--   $2: method_id       (VARCHAR) - メソッドID
--   $3: task_no         (INTEGER) - タスク連番
--   $4: organization_id (UUID)    - マルチテナント分離必須
--
-- Returns:
--   transition_data の全レコード（0件の場合は空結果）
--   transition_id, status, create_at, update_at

SELECT
  td.transition_id,
  td.status,
  td.create_at,
  td.update_at
FROM transition_data td
WHERE td.project_id      = $1
  AND td.method_id       = $2
  AND td.task_no         = $3
  AND td.organization_id = $4   -- マルチテナント分離（必須）
ORDER BY
  td.transition_id ASC;
