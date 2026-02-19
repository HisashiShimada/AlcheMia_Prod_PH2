-- プロジェクト詳細を取得（organization_id + project_idで検索）
-- 使用箇所: projectService.ts - requestApproval()
-- パラメータ: $1=organizationId, $2=projectId

SELECT 
  project_id,
  project_name,
  project_status,
  organization_id
FROM project
WHERE organization_id = $1 
  AND project_id = $2
