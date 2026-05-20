-- プロジェクト別バリデーション統計を取得するクエリ
-- $1: project_id, $2: organization_id
SELECT
  COUNT(*) AS total_validations,
  SUM(CASE WHEN is_valid THEN 1 ELSE 0 END) AS valid_count,
  SUM(CASE WHEN is_valid THEN 0 ELSE 1 END) AS invalid_count,
  ROUND(AVG(validation_duration_ms), 2) AS avg_duration_ms,
  ROUND(AVG(total_errors), 2) AS avg_errors,
  ROUND(AVG(total_warnings), 2) AS avg_warnings
FROM maiml_validation_history
WHERE project_id = $1
  AND organization_id = $2
