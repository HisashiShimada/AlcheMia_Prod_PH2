-- project_overall_evaluations: 下位評価を更新
UPDATE project_overall_evaluations
SET
    overall_digital    = $4,
    overall_analog     = $5,
    evaluated_user_id  = $6,
    evaluated_at       = NOW(),
    update_user_id     = $7,
    update_at          = NOW()
WHERE organization_id  = $1
  AND project_id       = $2
  AND evaluation_seq   = $3
RETURNING *
