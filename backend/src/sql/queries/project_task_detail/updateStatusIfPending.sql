-- project_task_detail: task_statusが PENDING(0) または REVIEW_NG(5) のときのみ IN_PROGRESS(1) に更新
-- 実験データ保存時・指示確認時に呼び出す（べき等な更新）
-- REVIEW_NG(5): 承認NG後に作業者が訂正保存したとき task_status を IN_PROGRESS に戻す
-- $1: organization_id
-- $2: project_id
-- $3: method_id
-- $4: task_no
UPDATE project_task_detail
SET task_status = 1,
    update_at   = NOW()
WHERE organization_id = $1
  AND project_id      = $2
  AND method_id       = $3
  AND task_no         = $4
  AND task_status     IN (0, 5)
