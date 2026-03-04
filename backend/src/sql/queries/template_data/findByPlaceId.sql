-- プレースIDでテンプレートデータを取得
-- 
-- Parameters:
--   $1: organization_id (UUID) - 組織ID（マルチテナント分離）
--   $2: project_id (VARCHAR(20)) - プロジェクトID
--   $3: method_id (TEXT) - メソッドID
--   $4: task_no (NUMERIC) - タスク番号
--   $5: place_id (TEXT) - プレースID
-- 
-- Returns:
--   該当するテンプレートデータ（1件）、見つからない場合は0件

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
  AND place_id = $5;
