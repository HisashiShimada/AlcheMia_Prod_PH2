-- maiml_publish_job: 公開ジョブを INSERT する
-- $1: job_type
-- $2: organization_id
-- $3: project_id
-- $4: asset_id
-- $5: status
-- $6: triggered_by
-- $7: trigger_type
-- $8: error_message
-- $9: started_at
-- $10: finished_at
INSERT INTO maiml_publish_job
  (job_type, organization_id, project_id, asset_id, status,
   triggered_by, trigger_type, error_message, started_at, finished_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING *
