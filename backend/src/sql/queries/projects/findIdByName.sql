-- プロジェクトID取得（プロジェクト名から）
-- 使用箇所: projectRepository.ts - findIdByName()
-- パラメータ: $1=organizationId, $2=projectName

SELECT project_id
FROM project
WHERE organization_id = $1 
  AND project_name = $2
