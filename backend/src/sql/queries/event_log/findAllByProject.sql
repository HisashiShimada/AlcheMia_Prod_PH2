-- maiml_event_log 全件取得クエリ（プロジェクト単位）
-- sequence_no 昇順で取得してイベントの発生順序を保持する
SELECT
  sequence_no,
  log
FROM maiml_event_log
WHERE organization_id = $1
  AND project_id = $2
ORDER BY sequence_no ASC
