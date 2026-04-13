-- プロジェクト詳細取得クエリ（オーナー名・部門名含む）
-- 使用箇所:
--   - progressService.ts - getWorkDetails()
-- パラメータ: $1=projectId, $2=organizationId

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
  ON p.department_cd = d.department_cd
  AND p.organization_id = d.organization_id
LEFT JOIN organization_user ou
  ON p.owner_user_id = ou.user_id
  AND p.organization_id = ou.organization_id
WHERE p.project_id = $1
  AND p.organization_id = $2
