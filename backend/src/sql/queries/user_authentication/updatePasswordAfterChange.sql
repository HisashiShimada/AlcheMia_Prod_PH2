-- パスワード変更後に更新するクエリ（有効期限を指定日数後に設定、一時フラグ解除）
-- $1: hashed_password, $2: user_id, $3: organization_id, $4: expiry_days
UPDATE user_authentication
SET password = $1,
    password_expires_at = NOW() + ($4 || ' days')::INTERVAL,
    is_temporary_flg = false,
    update_at = NOW()
WHERE user_id = $2
  AND organization_id = $3
