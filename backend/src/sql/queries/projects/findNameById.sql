-- プロジェクト名取得（プロジェクトIDから）
-- 使用箇所: progressService.ts - updateTransitionStatus()
-- パラメータ: $1=organizationId, $2=projectId

SELECT project_name
FROM project
WHERE organization_id = $1
  AND project_id = $2
