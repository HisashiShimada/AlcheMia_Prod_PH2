-- プロジェクト配下の未完了トランジション一覧を取得
-- 使用箇所: transitionDataRepository.ts - findActiveByProject()
-- パラメータ: $1=organization_id, $2=project_id
-- 対象: status が INITIAL(0)/PREPARING(1)/READY(2)/IN_PROGRESS(3)/PAUSED(4) のレコード
-- 用途: 強制終了時の EventLog 記録に必要な method_id / transition_id / task_no を取得
SELECT DISTINCT
  method_id,
  task_no,
  transition_id,
  status
FROM transition_data
WHERE organization_id = $1
  AND project_id      = $2
  AND status NOT IN (5, 6)
ORDER BY method_id, task_no, transition_id
