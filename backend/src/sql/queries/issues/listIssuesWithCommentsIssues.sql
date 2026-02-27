-- コメント付き問題一覧を取得する（問題一覧部分）
-- GET /api/v1/issues で使用
-- 動的フィルタ（status, issueType）はTypeScriptコードで追加される
SELECT
  i.issue_id AS id,
  i.issue_type AS "issueType",
  CASE 
    WHEN i.issue_target = 1 THEN 'project'
    WHEN i.issue_target = 2 THEN 'task'
    WHEN i.issue_target = 3 THEN 'transition'
  END AS "targetType",
  i.project_id AS "projectId",
  p.project_name AS "projectName",
  i.method_id AS "methodId",
  i.task_no AS "taskNo",
  i.transition_id AS "transitionId",
  i.issue_title AS title,
  i.issue_contents AS contents,
  i.status,
  i.issue_reporter_id AS "reportedBy",
  reporter.user_name AS "reportedByName",
  i.issue_report_at AS "reportedAt",
  i.issue_completer_id AS "completedBy",
  completer.user_name AS "completedByName",
  i.issue_complate_at AS "completedAt"
FROM issue i
INNER JOIN project p ON p.organization_id = i.organization_id AND p.project_id = i.project_id
INNER JOIN organization_user reporter ON reporter.organization_id = i.organization_id AND reporter.user_id = i.issue_reporter_id
LEFT JOIN organization_user completer ON completer.organization_id = i.organization_id AND completer.user_id = i.issue_completer_id
WHERE i.organization_id = $1
  AND i.project_id = $2
  AND i.method_id = $3
  AND (
    (i.issue_target = 1) OR
    (i.issue_target = 2 AND i.task_no = $4) OR
    (i.issue_target = 3 AND i.transition_id = $5)
  )
ORDER BY i.issue_report_at DESC
