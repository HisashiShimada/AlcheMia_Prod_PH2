-- 組織の問題一覧を取得する（データ取得用）
-- findByOrganization() メソッドで使用
-- 動的フィルタ（projectId, methodId, taskNo, transitionId, issueType, severity, status）はTypeScriptコードで追加される
-- 動的ソート（ORDER BY句）もTypeScriptコードで置換される
SELECT
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
FROM issues
WHERE organization_id = $1
ORDER BY create_at DESC
LIMIT $2 OFFSET $3
