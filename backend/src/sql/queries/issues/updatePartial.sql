-- 問題情報を部分更新する
-- update() メソッドで使用
-- SET句はTypeScriptコードで動的に構築される
-- このファイルはベーステンプレートとして使用
UPDATE issues
SET update_at = CURRENT_TIMESTAMP
WHERE issue_id = $1 AND organization_id = $2
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
