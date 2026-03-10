-- project_task_detailテーブルへのINSERT
-- タスク登録保存時に新規レコードを作成する際に使用
INSERT INTO project_task_detail (
  organization_id,
  project_id,
  method_id,
  task_no,
  task_status,
  create_user_id,
  create_at,
  update_user_id,
  update_at
) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, CURRENT_TIMESTAMP)
