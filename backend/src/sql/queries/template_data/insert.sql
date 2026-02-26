-- テンプレート実績 INSERT
-- タスク登録時に初期レコードを登録する
--
-- Parameters:
--   $1: organization_id (UUID)
--   $2: project_id (UUID)
--   $3: method_id (VARCHAR)
--   $4: task_no (NUMERIC)
--   $5: place_id (VARCHAR)
--   $6: property_set (JSONB) - テンプレートのプロパティ定義JSON
--   $7: create_user_id (VARCHAR)
--   $8: update_user_id (VARCHAR)

INSERT INTO template_data (
  organization_id,
  project_id,
  method_id,
  task_no,
  place_id,
  property_set,
  create_user_id,
  create_at,
  update_user_id,
  update_at
)
VALUES (
  $1, $2, $3, $4, $5, $6::jsonb, $7, CURRENT_TIMESTAMP, $8, CURRENT_TIMESTAMP
)
