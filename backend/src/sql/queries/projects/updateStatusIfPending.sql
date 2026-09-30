-- project: project_status が TASK_PENDING(1) のときのみ TASK_IN_PROGRESS(2) に更新
-- 実験データ保存時・指示確認時に呼び出す（べき等な更新）
-- $1: organization_id
-- $2: project_id
UPDATE project
SET project_status = 2,
    update_at      = NOW()
WHERE organization_id = $1
  AND project_id      = $2
  AND project_status  = 1
