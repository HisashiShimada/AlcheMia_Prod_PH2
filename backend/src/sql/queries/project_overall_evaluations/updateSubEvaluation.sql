-- project_overall_evaluations: 下位評価を更新
UPDATE project_overall_evaluations
SET
    overall_digital  = $4,
    overall_analog   = $5,
    evaluated_by     = $6,
    evaluated_at     = NOW()
WHERE organization_id  = $1
  AND evaluation_id    = $2
  AND project_id       = $3
RETURNING *
