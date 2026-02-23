-- 問題を作成する
-- POST /api/v1/issues で使用
INSERT INTO issues (
  organization_id,
  project_id,
  issue_id,
  method_id,
  issue_target,
  task_no,
  transition_id,
  issue_title,
  issue_type,
  issue_contents,
  status,
  issue_reporter_id,
  issue_report_at,
  issue_completer_id,
  issue_complate_at,
  create_user_id,
  create_at,
  update_user_id,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'unresolved',
  $11, NOW(), null, null,
  $11, NOW(), $11, NOW()
)
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
