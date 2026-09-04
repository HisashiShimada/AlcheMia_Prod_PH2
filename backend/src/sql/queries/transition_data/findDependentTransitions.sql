-- 前提トランジション完了時の連鎖更新対象取得
-- 指定された completed トランジションIDを prerequisite_transition_ids に含む、
-- 同プロジェクト内の INITIAL(1) なトランジションを返す。
--
-- Parameters:
--   $1: organization_id (UUID)
--   $2: project_id (UUID)
--   $3: completed_transition_id (VARCHAR)  -- 完了したトランジションID

SELECT
  method_id,
  task_no,
  transition_id,
  prerequisite_transition_ids
FROM transition_data
WHERE organization_id = $1
  AND project_id      = $2
  AND status          = 1                            -- 1: 初期状態（INITIAL）のみ対象
  AND prerequisite_transition_ids @> ARRAY[$3::text] -- 前提IDに完了トランジションを含む
ORDER BY method_id, task_no, transition_id