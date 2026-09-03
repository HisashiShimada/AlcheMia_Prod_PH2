-- トランジション進捗ログ取得クエリ（トランジション単位）
-- trace/@id が 'trace_{transitionId}_%' に一致するレコードを sequence_no 昇順で取得する。
-- transition_progress ログ と transition_comment ログが含まれるため、
-- サービス層で Alchemia:status プロパティの存在チェックによりフィルタリングすること。
SELECT
  sequence_no,
  log
FROM maiml_event_log
WHERE organization_id = $1
  AND project_id = $2
  AND log -> 'eventLog' -> 'log' -> 'trace' ->> '@id' LIKE ('trace_' || $3 || '_%')
ORDER BY sequence_no ASC
