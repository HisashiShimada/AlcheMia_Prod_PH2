-- ステータスを更新する
-- PATCH /api/v1/issues/status で使用
UPDATE issue
SET status = $1, 
  issue_completer_id = CASE WHEN $1 = 0 THEN NULL WHEN $1 = 1 THEN $2 ELSE issue_completer_id END,
  issue_complate_at = CASE WHEN $1 = 0 THEN NULL WHEN $1 = 1 THEN CURRENT_TIMESTAMP ELSE issue_complate_at END,
  update_user_id = $2, 
  update_at = CURRENT_TIMESTAMP
WHERE issue_id = $3 AND organization_id = $4
RETURNING
  organization_id AS "organizationId",
  project_id AS "projectId",
  issue_id AS "issueId",
  method_id AS "methodId",
  issue_target AS "issueTarget",
  task_no AS "taskNo",
  transition_id AS "transitionId",
  issue_title AS "issueTitle",
  issue_type AS "issueType",
  issue_contents AS "issueContents",
  status,
  issue_reporter_id AS "issueReporterId",
  issue_report_at AS "issueReportAt",
  issue_completer_id AS "issueCompleterId",
  issue_complate_at AS "issueComplateAt",
  create_user_id AS "createUserId",
  create_at AS "createAt",
  update_user_id AS "updateUserId",
  update_at AS "updateAt"
