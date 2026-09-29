-- project_overall_evaluations: プロジェクトの全体評価を取得（新しい順）
-- evaluation_scope = 'MAIML_PROJECT' のレコードのみを対象とする（下位評価は除外）
SELECT
    evaluation_seq,
    organization_id,
    project_id,
    evaluation_scope,
    evaluated_user_id,
    evaluated_at,
    overall_digital,
    overall_score,
    overall_analog,
    applied_rule_id,
    applied_rule_version,
    applied_rule_snapshot,
    aggregation_snapshot,
    create_user_id,
    create_at,
    update_user_id,
    update_at
FROM project_overall_evaluations
WHERE organization_id = $1
  AND project_id = $2
  AND evaluation_scope = 'MAIML_PROJECT'
ORDER BY evaluated_at DESC
