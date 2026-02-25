-- User情報を1件取得（JOIN含む）
-- 組織IDとユーザーIDで検索
SELECT 
  ou.user_id,
  ou.user_name,
  ou.mail_address,
  ou.department_cd,
  d.department_name,
  ou.role_cd,
  r.role_name,
  ou.is_active,
  ou.create_at,
  ou.update_at
FROM organization_user ou
LEFT JOIN department d 
  ON ou.organization_id = d.organization_id 
  AND ou.department_cd = d.department_cd
LEFT JOIN role r 
  ON ou.organization_id = r.organization_id 
  AND ou.role_cd = r.role_cd
LEFT JOIN user_authentication ua 
  ON ou.user_id = ua.user_id 
  AND ou.organization_id = ua.organization_id
WHERE ou.organization_id = $1
  AND ou.user_id = $2
