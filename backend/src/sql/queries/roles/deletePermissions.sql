-- ロール権限削除クエリ
-- 指定の組織IDとロールCDに紐づく権限を全件削除（updateRolePermissions用）
DELETE FROM role_permission
WHERE organization_id = $1
  AND role_cd = $2
