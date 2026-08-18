-- ユーザーIDで組織ユーザーを取得するクエリ（ロール情報含む）
-- $1: user_id, $2: organization_id
SELECT
  ou.user_id,
  ou.user_name,
  ou.mail_address,
  ou.role_cd,
  ou.organization_id,
  ou.is_active,
  o.corporation_id,
  r.initial_screen_function_cd,
  r.role_name,
  o.organization_display_name,
  ARRAY(
    SELECT ogu.organization_group_cd
    FROM organization_group_user ogu
    WHERE ogu.organization_id = ou.organization_id
      AND ogu.user_id = ou.user_id
    ORDER BY ogu.organization_group_cd
  ) AS organization_group_cds
FROM organization_user ou
JOIN role r ON ou.role_cd = r.role_cd AND ou.organization_id = r.organization_id
LEFT JOIN organization o ON ou.organization_id = o.organization_id
WHERE ou.user_id = $1
  AND ou.organization_id = $2
