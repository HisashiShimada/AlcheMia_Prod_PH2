-- login_history: ログイン履歴を記録
-- $1: user_id (user_name)
-- $2: organization_id
-- $3: login_sf (success flag)
-- $4: failure_reason
-- $5: ip_address
-- $6: user_agent
-- $7: entry_execute_flg
INSERT INTO login_history (
  user_id,
  organization_id,
  login_at,
  login_sf,
  failure_reason,
  ip_address,
  user_agent,
  entry_execute_flg,
  create_user_id,
  create_at
)
VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $1, CURRENT_TIMESTAMP)
