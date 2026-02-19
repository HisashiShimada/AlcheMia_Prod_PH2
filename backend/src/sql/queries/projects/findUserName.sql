-- ユーザー名を取得
-- 使用箇所: projectService.ts - requestApproval()
-- パラメータ: $1=organizationId, $2=userId

SELECT user_name
FROM organization_user
WHERE organization_id = $1 
  AND user_id = $2
