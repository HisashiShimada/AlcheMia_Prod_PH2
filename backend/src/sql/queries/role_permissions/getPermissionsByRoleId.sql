-- ロールCDと組織IDに対応する権限情報を取得するクエリ
-- $1: role_cd, $2: organization_id
SELECT function_cd, permission
FROM role_permission
WHERE role_cd = $1
  AND organization_id = $2
ORDER BY function_cd
