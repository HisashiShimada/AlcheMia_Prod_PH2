-- チェックアウト実行（checkout_status=1, project_status=$4 に更新）
-- 使用箇所:
--   - projectRepository.ts - updateCheckoutStatus()
-- パラメータ: $1=organizationId, $2=projectId, $3=userId, $4=targetProjectStatus

UPDATE project
SET checkout_status = 1,
    project_status = $4,
    owner_user_id = $3,
    update_user_id = $3,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = $1
  AND project_id = $2
