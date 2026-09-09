-- experiment_uncertainty_judge INSERT
--
-- パラメータ:
--   $1  organization_id
--   $2  project_id
--   $3  method_id
--   $4  task_no
--   $5  transition_id
--   $6  template_id
--   $7  property_key
--   $8  uncertainty_key
--   $9  uncertainty_version
--   $10 tolerance_upper       (NULL許容)
--   $11 tolerance_lower       (NULL許容)
--   $12 recorded_value
--   $13 judge_result          ('良好' または '不良')
--   $14 create_user_id
--   $15 update_user_id

INSERT INTO experiment_uncertainty_judge (
    organization_id,
    project_id,
    method_id,
    task_no,
    transition_id,
    template_id,
    property_key,
    uncertainty_key,
    uncertainty_version,
    tolerance_upper,
    tolerance_lower,
    recorded_value,
    judge_result,
    create_user_id,
    create_at,
    update_user_id,
    update_at
)
VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    $7,
    $8,
    $9,
    $10,
    $11,
    $12,
    $13,
    $14,
    NOW(),
    $15,
    NOW()
)
RETURNING judge_seq

