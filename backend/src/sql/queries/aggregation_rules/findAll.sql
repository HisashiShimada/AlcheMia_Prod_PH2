-- aggregation_rules: テナントのルール履歴一覧を取得（版降順）
SELECT
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
FROM aggregation_rules
WHERE organization_id = $1
ORDER BY version DESC
