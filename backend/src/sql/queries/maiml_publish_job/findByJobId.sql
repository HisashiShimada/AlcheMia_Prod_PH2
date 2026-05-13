-- maiml_publish_job: job_id でジョブを1件取得
-- $1: job_id
SELECT *
FROM maiml_publish_job
WHERE job_id = $1
