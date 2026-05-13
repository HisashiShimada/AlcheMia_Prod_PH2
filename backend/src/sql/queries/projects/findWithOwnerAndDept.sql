-- プロジェクト詳細をオーナー名・部門名付きで取得（progressService.getWorkDetails() から移行）
-- $1: project_id
-- $2: organization_id
SELECT
  p.organization_id,
  p.project_id,
  p.project_name,
  p.description,
  p.department_cd,
  d.department_name,
  p.owner_user_id,
  ou.user_name AS owner_name,
  p.project_status,
  p.checkout_status,
  p.create_at,
  p.update_at
FROM project p
LEFT JOIN department d
  ON d.organization_id = p.organization_id
  AND d.department_cd = p.department_cd
LEFT JOIN organization_user ou
  ON ou.organization_id = p.organization_id
  AND ou.user_id = p.owner_user_id
WHERE p.project_id = $1
  AND p.organization_id = $2
