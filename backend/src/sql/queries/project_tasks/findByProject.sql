-- プロジェクト内のタスク一覧を取得するクエリ（experiment_order順）
-- $1: organization_id, $2: project_id
SELECT *
FROM project_task
WHERE organization_id = $1
  AND project_id = $2
ORDER BY experiment_order ASC
