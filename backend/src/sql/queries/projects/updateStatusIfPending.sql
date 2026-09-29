-- project: project_status が TASK_PENDING(1) または REVIEW_REJECTED(6) のときのみ TASK_IN_PROGRESS(2) に更新
-- 実験データ保存時・指示確認時に呼び出す（べき等な更新）
-- REVIEW_REJECTED(6): 承認NG後に作業者が訂正保存したとき project_status を IN_PROGRESS に戻す
-- $1: organization_id
-- $2: project_id
UPDATE project
SET project_status = 2,
    update_at      = NOW()
WHERE organization_id = $1
  AND project_id      = $2
  AND project_status  IN (1, 6)
