-- タスク NG 記録クエリ
-- task_status=4（レビュー待ち）のタスクを task_status=6（NG）に更新する
-- review_result カラムは 20260618_005 マイグレーション追加済みが前提
-- 対象が存在しない・ステータスが違う場合は RETURNING が空になる（エラーにしない）
UPDATE project_task_detail
SET
  task_status    = 6,
  review_result  = $6,
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
