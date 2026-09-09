-- トランジション数カウント（プロジェクト単位）
-- task_no > 0 の実績行のみ対象（task_no=0 は順序管理行で status=NULL のため除外）
--
-- Parameters:
--   $1: organization_id (UUID)
--   $2: project_id (UUID)

SELECT COUNT(*) AS count
FROM transition_data
WHERE organization_id = $1
  AND project_id      = $2
  AND task_no         > 0
