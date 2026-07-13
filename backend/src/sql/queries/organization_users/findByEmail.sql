-- メールアドレスで組織ユーザーを取得するクエリ
-- $1: mail_address, $2: organization_id
SELECT
  ou.user_id,
  ou.user_name,
  ou.mail_address,
  ou.role_cd,
  ou.organization_id,
  ou.is_active,
  o.corporation_id,
  ARRAY(
    SELECT ogu.organization_group_cd
    FROM organization_group_user ogu
    WHERE ogu.organization_id = ou.organization_id
      AND ogu.user_id = ou.user_id
    ORDER BY ogu.organization_group_cd
  ) AS organization_group_cds
FROM organization_user ou
LEFT JOIN organization o ON ou.organization_id = o.organization_id
WHERE ou.mail_address = $1
  AND ou.organization_id = $2
