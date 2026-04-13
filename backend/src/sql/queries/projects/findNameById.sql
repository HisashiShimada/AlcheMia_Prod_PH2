-- プロジェクト名・UUID取得（プロジェクトIDから）
-- 使用箇所: progressService.ts - downloadAndParseMAIML()
-- パラメータ: $1=organizationId, $2=projectId

SELECT project_name, project_uuid
FROM project
WHERE organization_id = $1
  AND project_id = $2
