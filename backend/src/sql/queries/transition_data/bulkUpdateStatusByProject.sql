-- プロジェクト配下の未完了トランジションを一括 ERROR に更新
-- 使用箇所: transitionDataRepository.ts - bulkUpdateStatusByProject()
-- パラメータ:
--   $1: 変更先ステータス（ERROR=6）
--   $2: update_user_id（更新者ユーザーID）
--   $3: organization_id
--   $4: project_id
-- 対象: status が INITIAL(0)/PREPARING(1)/READY(2)/IN_PROGRESS(3)/PAUSED(4) のレコード
UPDATE transition_data
SET status          = $1,
    update_user_id  = $2,
    update_at       = CURRENT_TIMESTAMP
WHERE organization_id = $3
  AND project_id      = $4
  AND status NOT IN (5, 6)
RETURNING
  organization_id,
  project_id,
  method_id,
  task_no,
  transition_id,
  status,
  update_user_id,
  update_at
