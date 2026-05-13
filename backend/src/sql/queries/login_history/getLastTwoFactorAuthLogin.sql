-- login_history: 最終二段階認証ログイン情報を取得（entry_execute_flg=trueのみ）
-- $1: user_id
-- $2: organization_id
SELECT
  user_id,
  organization_id,
  login_at
FROM login_history
WHERE user_id = $1
  AND organization_id = $2
  AND login_sf = true
  AND entry_execute_flg = true
ORDER BY login_at DESC
LIMIT 1
