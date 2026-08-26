-- User情報を1件取得（JOIN含む）
-- 組織IDとユーザーIDで検索
SELECT 
  ou.user_id,
  ou.user_name,
  ou.mail_address,
  ou.role_cd,
  r.role_name,
  ou.is_active,
  ou.create_at,
  ou.update_at,
  ARRAY(
    SELECT ogu.organization_group_cd
    FROM organization_group_user ogu
    WHERE ogu.organization_id = ou.organization_id
      AND ogu.user_id = ou.user_id
    ORDER BY ogu.organization_group_cd
  ) AS organization_group_cds,
  ns.uri AS namespace_uri
FROM organization_user ou
LEFT JOIN role r 
  ON ou.organization_id = r.organization_id 
  AND ou.role_cd = r.role_cd
LEFT JOIN user_authentication ua 
  ON ou.user_id = ua.user_id 
  AND ou.organization_id = ua.organization_id
LEFT JOIN namespace ns
  ON ns.organization_id = ou.organization_id
  AND ns.scope_key = ou.user_id
WHERE ou.organization_id = $1
  AND ou.user_id = $2
