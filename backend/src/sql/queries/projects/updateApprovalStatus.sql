-- プロジェクトステータスを承認待ち(waiting_approval)に更新
-- 使用箇所: projectService.ts - requestApproval()
-- パラメータ: $1=projectStatus(3: タスク結果レビュー待ち), $2=updateAt, $3=updateUserId, $4=organizationId, $5=projectId
-- ステータス定義: 0=計画中, 1=タスク実行待ち, 2=タスク実行中, 3=タスク結果レビュー待ち(承認待ち), 4=完了, 5=異常終了

UPDATE project
SET project_status = $1,
    checkout_status = 0,
    update_at = $2,
    update_user_id = $3
WHERE organization_id = $4 
  AND project_id = $5
