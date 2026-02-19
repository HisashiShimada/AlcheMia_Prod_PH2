-- プロジェクトステータスを承認待ち(waiting_approval)に更新
-- 使用箇所: projectService.ts - requestApproval()
-- パラメータ: $1=projectStatus(2), $2=updateAt, $3=updateUserId, $4=organizationId, $5=projectId

UPDATE project
SET project_status = $1,
    update_at = $2,
    update_user_id = $3
WHERE organization_id = $4 
  AND project_id = $5
