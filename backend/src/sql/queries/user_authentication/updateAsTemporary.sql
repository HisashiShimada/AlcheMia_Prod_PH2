-- 一時パスワードとして更新するクエリ（有効期限24時間後）
-- $1: hashed_password, $2: user_id, $3: organization_id
UPDATE user_authentication
SET password = $1,
    password_expires_at = NOW() + INTERVAL '24 hours',
    is_temporary_flg = true,
    update_at = NOW()
WHERE user_id = $2
  AND organization_id = $3
