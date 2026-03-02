-- システム概要: ログイン統計取得（過去7日間）
-- login_historyテーブルのorganization_idに紐づく過去7日の総数・成功・失敗を取得
SELECT
  COUNT(*)::INTEGER AS total,
  COUNT(*) FILTER (WHERE login_sf = TRUE)::INTEGER AS success,
  COUNT(*) FILTER (WHERE login_sf = FALSE)::INTEGER AS failed
FROM login_history
WHERE organization_id = $1
  AND login_at >= NOW() - INTERVAL '7 days'
