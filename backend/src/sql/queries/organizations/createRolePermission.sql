-- ロール権限新規作成（重複時はスキップ）
INSERT INTO role_permission (
  organization_id,
  role_cd,
  function_cd,
  permission,
  create_user_id,
  update_user_id,
  create_at,
  update_at
) VALUES (
  $1, $2, $3, $4, $5, $6, NOW(), NOW()
)
ON CONFLICT (organization_id, role_cd, function_cd) DO NOTHING
