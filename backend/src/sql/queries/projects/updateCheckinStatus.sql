-- チェックイン実行（checkout_status=0 に更新）
-- 使用箇所:
--   - projectRepository.ts - updateCheckinStatus()
-- パラメータ: $1=organizationId, $2=projectId

UPDATE project
SET checkout_status = 0,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = $1
  AND project_id = $2
