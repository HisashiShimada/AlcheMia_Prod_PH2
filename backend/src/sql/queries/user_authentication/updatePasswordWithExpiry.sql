-- パスワードを有効期限・一時フラグ付きで更新するクエリ
-- $1: hashed_password, $2: expires_at, $3: is_temporary, $4: user_id, $5: organization_id
UPDATE user_authentication
SET password = $1,
    password_expires_at = $2,
    is_temporary_flg = $3,
    update_at = NOW()
WHERE user_id = $4
  AND organization_id = $5
