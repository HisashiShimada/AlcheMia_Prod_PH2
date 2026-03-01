-- Role 1件取得クエリ（role_permissionをJOIN）
-- 組織IDとロールCDでフィルタリングして1件取得（権限情報含む）
SELECT
  r.role_cd,
  r.role_name,
  r.is_active,
  r.initial_screen_function_cd,
  r.update_at,
  rp.function_cd,
  rp.permission
FROM role r
LEFT JOIN role_permission rp
  ON r.organization_id = rp.organization_id
  AND r.role_cd = rp.role_cd
WHERE r.organization_id = $1
  AND r.role_cd = $2
ORDER BY rp.function_cd
