-- maiml_publish_job: 現在公開済みアセットIDを返す（最新 done ジョブのみ）
-- $1: organization_id
-- $2: project_id
SELECT job_type, asset_id
FROM maiml_publish_job
WHERE organization_id = $1
  AND project_id = $2
  AND status = 'done'
ORDER BY created_at DESC
LIMIT 1
