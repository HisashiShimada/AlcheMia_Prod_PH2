-- ロール権限挿入クエリ
-- 指定の組織ID・ロールCD・機能CD・権限値でrole_permissionに1件挿入
INSERT INTO role_permission (
  organization_id,
  role_cd,
  function_cd,
  permission,
  create_user_id,
  create_at,
  update_user_id,
  update_at
)
VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, CURRENT_TIMESTAMP)
