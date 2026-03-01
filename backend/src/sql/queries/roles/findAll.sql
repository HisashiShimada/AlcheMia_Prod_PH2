-- Role一覧取得クエリ（role_permissionをJOIN）
-- 組織IDでフィルタリングし、ロールと権限情報を結合して取得
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
ORDER BY r.role_cd, rp.function_cd
