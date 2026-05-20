-- パスワードリセットトークンで検索するクエリ
SELECT
  user_id,
  organization_id,
  role_cd,
  expires_at,
  is_used
FROM password_reset_tokens
WHERE reset_token = $1
