-- aggregation_rules: テナントのACTIVEルールを取得
SELECT
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
FROM aggregation_rules
WHERE organization_id = $1
  AND status = 'ACTIVE'
ORDER BY version DESC
LIMIT 1
