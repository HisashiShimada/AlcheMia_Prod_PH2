-- Roleアクティブ状態更新クエリ
UPDATE role
SET is_active = $1,
    update_user_id = $2,
    update_at = NOW()
WHERE organization_id = $3
  AND role_cd = $4
RETURNING
  organization_id,
  role_cd,
  role_name,
  initial_screen_function_cd,
  is_active,
  create_at,
  update_at
