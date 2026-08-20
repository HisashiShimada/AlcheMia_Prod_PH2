-- project_overall_evaluations: 全体評価を登録（断面凍結）
INSERT INTO project_overall_evaluations (
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
) VALUES (
    $1,   -- organization_id
    $2,   -- project_id
    $3,   -- evaluation_scope
    $4,   -- evaluated_user_id
    NOW(),
    $5,   -- overall_digital
    $6,   -- overall_score
    $7,   -- overall_analog
    $8,   -- applied_rule_id
    $9,   -- applied_rule_version
    $10,  -- applied_rule_snapshot (JSONB)
    $11,  -- aggregation_snapshot (JSONB)
    $12,  -- create_user_id
    NOW(),
    $12,  -- update_user_id (初回は create_user_id と同値)
    NOW()
)
RETURNING *
