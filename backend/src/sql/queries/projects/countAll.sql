-- プロジェクト総件数取得
-- 使用箇所:
--   - projectRepository.ts - countAll()
-- パラメータ: $1=organizationId, $2=includeCompleted(boolean), $3=visibleGroupCds(text[]|NULL)
-- $3 が NULL の場合は全件カウント（SystemAdmin用）

SELECT COUNT(*) AS total
FROM project
WHERE organization_id = $1
  AND ($2::boolean IS NULL OR
       ($2 = true OR project_status != 4))
  AND ($3::text[] IS NULL OR organization_group_cd = ANY($3::text[]))
