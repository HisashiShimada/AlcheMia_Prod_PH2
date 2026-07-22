-- experiment_evaluation: 評価結果のUPSERT
-- 同一キーが存在する場合は更新、なければ挿入
INSERT INTO experiment_evaluation (
    organization_id,
    project_id,
    evaluation_unit,
    method_id,
    task_no,
    transition_id,
    name_space_id,
    uncertainty_key,
    uc_version,
    evaluation_value,
    comment,
    uncertainty_xml,
    evaluated_by,
    evaluated_at,
    create_user_id,
    create_at,
    update_user_id,
    update_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), $15, NOW()
)
ON CONFLICT ON CONSTRAINT experiment_evaluation_PKC
DO UPDATE SET
    uc_version       = EXCLUDED.uc_version,
    evaluation_value = EXCLUDED.evaluation_value,
    comment          = EXCLUDED.comment,
    uncertainty_xml  = EXCLUDED.uncertainty_xml,
    evaluated_by     = EXCLUDED.evaluated_by,
    evaluated_at     = EXCLUDED.evaluated_at,
    update_user_id   = EXCLUDED.update_user_id,
    update_at        = NOW()
RETURNING *
