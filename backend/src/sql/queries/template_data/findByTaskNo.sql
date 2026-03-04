-- タスク番号でテンプレートデータを取得
-- 
-- Parameters:
--   $1: organization_id (UUID) - 組織ID（マルチテナント分離）
--   $2: project_id (VARCHAR(20)) - プロジェクトID
--   $3: method_id (TEXT) - メソッドID
--   $4: task_no (NUMERIC) - タスク番号
-- 
-- Returns:
--   該当するテンプレートデータの配列（place_id順）

SELECT
  organization_id,
  project_id,
  method_id,
  task_no,
  place_id,
  property_set,
  create_user_id,
  update_user_id,
  create_at,
  update_at
FROM template_data
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
  AND task_no = $4
ORDER BY place_id;
