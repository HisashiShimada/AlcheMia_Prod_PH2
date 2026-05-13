-- maiml_publish_job: プロジェクトの最新ジョブを取得
-- $1: organization_id
-- $2: project_id
SELECT *
FROM maiml_publish_job
WHERE organization_id = $1
  AND project_id = $2
ORDER BY created_at DESC
LIMIT 1
