-- トランジションに紐づくプレースIDリストでテンプレートタイプ別の実績数をカウント
--
-- Parameters:
--   $1: organization_id (UUID) - 組織ID（マルチテナント分離）
--   $2: project_id (VARCHAR(20)) - プロジェクトID
--   $3: method_id (TEXT) - メソッドID
--   $4: task_no (NUMERIC) - タスク番号
--   $5: place_ids (TEXT[]) - プレースIDの配列
--
-- Returns:
--   templateType別のカウント結果
--   例: { template_type: 'material', count: '3' }

SELECT
  property_set->>'templateType' AS template_type,
  COUNT(*) AS count
FROM template_data
WHERE organization_id = $1
  AND project_id = $2
  AND method_id = $3
  AND task_no = $4
  AND place_id = ANY($5)
GROUP BY property_set->>'templateType'
