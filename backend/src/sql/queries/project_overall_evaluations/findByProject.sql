-- project_overall_evaluations: プロジェクトの全体評価を取得（新しい順）
SELECT
    evaluation_id,
    organization_id,
    project_id,
    evaluation_scope,
    evaluated_by,
    evaluated_at,
    overall_digital,
    overall_score,
    overall_analog,
    applied_rule_id,
    applied_rule_version,
    applied_rule_snapshot,
    aggregation_snapshot,
    create_user_id,
    create_at
FROM project_overall_evaluations
WHERE organization_id = $1
  AND project_id = $2
ORDER BY evaluated_at DESC
