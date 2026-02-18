-- プレースIDでテンプレートデータを取得
-- 
-- Parameters:
--   $1: organization_id (UUID) - 組織ID（マルチテナント分離）
--   $2: project_id (UUID) - プロジェクトID
--   $3: method_id (TEXT) - メソッドID
--   $4: task_no (INTEGER) - タスク番号
--   $5: place_id (TEXT) - プレースID
-- 
-- Returns:
--   該当するテンプレートデータ（1件）、見つからない場合は0件

SELECT
  id,
  organization_id,
  project_id,
  method_id,
  task_no,
  place_id,
  template_type,
  template_id,
  data,
  status,
  comment,
  recorded_by,
  recorded_at,
  created_at,
  updated_at
FROM template_data
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
  AND task_no = $4
  AND place_id = $5;
