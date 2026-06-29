-- タスク承認クエリ
-- task_status=2（レビュー待ち）のタスクを task_status=3（完了）に更新する
-- 承認は既存の completed（03）ステータスを使用する
-- 対象が存在しない・ステータスが違う場合は RETURNING が空になる（エラーにしない）
UPDATE project_task_detail
SET
  task_status    = 3,
  reviewed_at    = NOW(),
  review_user_id = $5,
  update_user_id = $5,
  update_at      = NOW()
WHERE organization_id = $1
  AND project_id      = $2
  AND method_id       = $3
  AND task_no         = $4
  AND task_status     = 2
RETURNING *
