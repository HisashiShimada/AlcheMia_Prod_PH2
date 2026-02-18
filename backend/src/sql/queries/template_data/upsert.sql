-- テンプレートデータのUPSERT（INSERT or UPDATE）
-- 一意キー(organization_id, project_id, method_id, task_no, place_id)で既存レコードを検索し、
-- 存在する場合は更新、存在しない場合は新規作成
-- 
-- Parameters:
--   $1: organization_id (UUID) - 組織ID（マルチテナント分離）
--   $2: project_id (UUID) - プロジェクトID
--   $3: method_id (TEXT) - メソッドID
--   $4: task_no (INTEGER) - タスク番号
--   $5: place_id (TEXT) - プレースID
--   $6: template_type (TEXT) - テンプレートタイプ（material, condition, result）
--   $7: template_id (TEXT) - テンプレートID
--   $8: data (JSONB) - テンプレートデータ
--   $9: status (TEXT) - ステータス（null可）
--   $10: comment (TEXT) - コメント（null可）
--   $11: recorded_by (UUID) - 記録者のユーザーID
-- 
-- Returns:
--   保存されたテンプレートデータの全カラム

INSERT INTO template_data (
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
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, project_id, method_id, task_no, place_id)
DO UPDATE SET
  template_type = EXCLUDED.template_type,
  template_id = EXCLUDED.template_id,
  data = EXCLUDED.data,
  status = EXCLUDED.status,
  comment = EXCLUDED.comment,
  recorded_by = EXCLUDED.recorded_by,
  recorded_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP
RETURNING
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
  updated_at;
