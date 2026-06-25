-- タスク承認クエリ
-- task_status=4（レビュー待ち）のタスクを task_status=5（承認済み）に更新する
-- 対象が存在しない・ステータスが違う場合は RETURNING が空になる（エラーにしない）
UPDATE project_task_detail
SET
  task_status    = 5,
  reviewed_at    = NOW(),
  review_user_id = $5,
  update_user_id = $5,
  update_at      = NOW()
WHERE organization_id = $1
  AND project_id      = $2
  AND method_id       = $3
  AND task_no         = $4
  AND task_status     = 4
RETURNING *
