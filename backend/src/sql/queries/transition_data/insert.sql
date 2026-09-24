-- トランジション実績 INSERT
-- タスク登録時に初期レコードを登録する
--
-- Parameters:
--   $1: organization_id (UUID)
--   $2: project_id (UUID)
--   $3: method_id (VARCHAR)
--   $4: task_no (NUMERIC)
--   $5: transition_id (VARCHAR)
--   $6: status (NUMERIC) - 初期値: 1
--   $7: work_order (NUMERIC) - 実行順序（実験計画の __meta__.transitionOrder.order から設定）
--   $8: prerequisite_transition_ids (VARCHAR[]) - 前提トランジションID配列
--   $9: create_user_id (VARCHAR)
--   $10: update_user_id (VARCHAR)

INSERT INTO transition_data (
  organization_id,
  project_id,
  method_id,
  task_no,
  transition_id,
  status,
  work_order,
  prerequisite_transition_ids,
  create_user_id,
  create_at,
  update_user_id,
  update_at
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, $10, CURRENT_TIMESTAMP
)
