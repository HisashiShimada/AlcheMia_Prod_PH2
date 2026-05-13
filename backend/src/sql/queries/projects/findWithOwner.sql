-- プロジェクト情報とオーナーユーザー名を結合して取得
-- チェックアウト状態照会で使用
-- 使用箇所:
--   - projectRepository.ts - findWithOwner()
-- パラメータ: $1=organizationId, $2=projectId

SELECT
  p.project_id,
  p.project_name,
  p.checkout_status,
  p.owner_user_id,
  ou.user_name AS owner_user_name
FROM project p
LEFT JOIN organization_user ou
  ON ou.user_id = p.owner_user_id
  AND ou.organization_id = p.organization_id
WHERE p.organization_id = $1
  AND p.project_id = $2
