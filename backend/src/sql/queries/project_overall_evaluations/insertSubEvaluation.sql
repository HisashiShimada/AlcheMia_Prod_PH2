-- project_overall_evaluations: 下位評価を新規INSERT
INSERT INTO project_overall_evaluations (
    evaluation_id,
    organization_id,
    project_id,
    evaluation_scope,
    method_id,
    task_no,
    transition_id,
    evaluated_by,
    evaluated_at,
    overall_digital,
    overall_analog,
    applied_rule_id,
    applied_rule_version,
    applied_rule_snapshot,
    aggregation_snapshot,
    create_user_id,
    create_at
) VALUES (
    gen_random_uuid(),
    $1,   -- organization_id
    $2,   -- project_id
    $3,   -- evaluation_scope
    $4,   -- method_id (nullable)
    $5,   -- task_no (nullable)
    $6,   -- transition_id (nullable)
    $7,   -- evaluated_by
    NOW(),
    $8,   -- overall_digital (nullable)
    $9,   -- overall_analog (nullable)
    NULL, -- applied_rule_id (下位評価では常に NULL)
    NULL, -- applied_rule_version (下位評価では常に NULL)
    NULL, -- applied_rule_snapshot (下位評価では常に NULL)
    NULL, -- aggregation_snapshot (下位評価では常に NULL)
    $10,  -- create_user_id
    NOW()
)
RETURNING *
