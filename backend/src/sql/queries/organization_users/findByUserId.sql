-- ユーザーIDで組織ユーザーを取得するクエリ（基本情報）
-- $1: user_id, $2: organization_id
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
WHERE ou.user_id = $1
  AND ou.organization_id = $2
