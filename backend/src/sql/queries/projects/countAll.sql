-- プロジェクト総件数取得
-- 使用箇所:
--   - projectRepository.ts - countAll()
-- パラメータ: $1=organizationId, $2=includeCompleted(boolean)

SELECT COUNT(*) AS total
FROM project
WHERE organization_id = $1
  AND ($2::boolean IS NULL OR
       ($2 = true OR project_status != 4))
