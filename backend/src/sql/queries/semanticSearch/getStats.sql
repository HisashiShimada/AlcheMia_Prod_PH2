-- 組織内のインデックス統計を取得
-- プロジェクト別にトランジションセット数とファイル数を集計

SELECT
  project_name,
  COUNT(*) AS transition_set_count,
  COUNT(DISTINCT file_id) AS file_count
FROM transition_set
WHERE organization_id = $1
GROUP BY project_name
ORDER BY project_name NULLS LAST
