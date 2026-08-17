-- aggregation_rules: 新版を挿入して ACTIVE に設定
INSERT INTO aggregation_rules (
    rule_id,
    organization_id,
    version,
    status,
    score_good,
    score_caution,
    score_bad,
    target_rollup,
    level_status_rule,
    level_score_rule,
    missing_handling,
    transition_hierarchy,
    created_by,
    created_at
) VALUES (
    gen_random_uuid(),
    $1,  -- organization_id
    $2,  -- version
    'ACTIVE',
    $3,  -- score_good
    $4,  -- score_caution
    $5,  -- score_bad
    $6,  -- target_rollup
    $7,  -- level_status_rule
    $8,  -- level_score_rule
    $9,  -- missing_handling
    $10, -- transition_hierarchy
    $11, -- created_by
    NOW()
)
RETURNING *
