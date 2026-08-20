-- プロジェクトのメソッドID一覧取得クエリ
-- プロジェクト配下のタスクからメソッドIDを重複排除して取得する
SELECT DISTINCT method_id
FROM project_task
WHERE organization_id = $1
  AND project_id      = $2
ORDER BY method_id
