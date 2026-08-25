-- aggregation_rules: 新版を挿入して ACTIVE に設定
INSERT INTO aggregation_rules (
    rule_id,
    organization_id,
    version,
    is_active,
    score_good,
    score_caution,
    score_bad,
    target_rollup,
    level_status_rule,
    level_score_rule,
    missing_handling,
    transition_hierarchy,
    create_user_id,
    create_at,
    update_user_id,
    update_at
) VALUES (
    gen_random_uuid(),
    $1,  -- organization_id
    $2,  -- version
    true,
    $3,  -- score_good
    $4,  -- score_caution
    $5,  -- score_bad
    $6,  -- target_rollup
    $7,  -- level_status_rule
    $8,  -- level_score_rule
    $9,  -- missing_handling
    $10, -- transition_hierarchy
    $11, -- create_user_id
    NOW(),
    NULL, -- update_user_id
    NOW()
)
RETURNING *
