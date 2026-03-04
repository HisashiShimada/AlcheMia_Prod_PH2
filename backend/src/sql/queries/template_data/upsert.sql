-- テンプレートデータのUPSERT（INSERT or UPDATE）
-- 一意キー(organization_id, project_id, method_id, task_no, place_id)で既存レコードを検索し、
-- 存在する場合は更新、存在しない場合は新規作成
-- 
-- Parameters:
--   $1: organization_id (UUID) - 組織ID（マルチテナント分離）
--   $2: project_id (VARCHAR(20)) - プロジェクトID
--   $3: method_id (TEXT) - メソッドID
--   $4: task_no (NUMERIC) - タスク番号
--   $5: place_id (TEXT) - プレースID
--   $6: property_set (JSONB) - テンプレートデータ（templateId, templateType, properties）
--   $7: create_user_id (TEXT) - 作成者ユーザーID
--   $8: update_user_id (TEXT) - 更新者ユーザーID
-- 
-- Returns:
--   保存されたテンプレートデータの全カラム

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
ON CONFLICT (organization_id, project_id, method_id, task_no, place_id)
DO UPDATE SET
  property_set = EXCLUDED.property_set,
  update_user_id = EXCLUDED.update_user_id,
  update_at = CURRENT_TIMESTAMP
RETURNING
  organization_id,
  project_id,
  method_id,
  task_no,
  place_id,
  property_set,
  create_user_id,
  update_user_id,
  create_at,
  update_at;
