-- メールアドレスで組織ユーザーを取得するクエリ
-- $1: mail_address, $2: organization_id
SELECT
  ou.user_id,
  ou.user_name,
  ou.mail_address,
  ou.role_cd,
  ou.organization_id,
  ou.is_active,
  ou.department_cd,
  o.corporation_id
FROM organization_user ou
LEFT JOIN organization o ON ou.organization_id = o.organization_id
WHERE ou.mail_address = $1
  AND ou.organization_id = $2
