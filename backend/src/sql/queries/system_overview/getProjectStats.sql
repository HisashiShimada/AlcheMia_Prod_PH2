-- システム概要: プロジェクト統計取得
-- projectテーブルのorganization_idに紐づく総数およびproject_status別件数を取得
SELECT
  COUNT(*)::INTEGER AS total,
  COUNT(*) FILTER (WHERE project_status IN ('0', '1'))::INTEGER AS planning,
  COUNT(*) FILTER (WHERE project_status IN ('2', '3'))::INTEGER AS in_progress,
  COUNT(*) FILTER (WHERE project_status IN ('4', '5'))::INTEGER AS completed
FROM project
WHERE organization_id = $1
