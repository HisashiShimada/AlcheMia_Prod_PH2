-- プロジェクト名の重複チェック
-- 使用箇所:
--   - projectRepository.ts - existsByName()
-- パラメータ: $1=organizationId, $2=projectName

SELECT COUNT(*) AS count
FROM project
WHERE organization_id = $1
  AND project_name = $2
