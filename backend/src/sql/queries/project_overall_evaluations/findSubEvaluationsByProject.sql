-- project_overall_evaluations: 下位評価一覧取得
-- evaluation_scope が MAIML_PROJECT 以外のレコードを取得する
SELECT
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
    create_user_id,
    create_at
FROM project_overall_evaluations
WHERE organization_id = $1
  AND project_id      = $2
  AND evaluation_scope <> 'MAIML_PROJECT'
ORDER BY
    evaluation_scope,
    method_id   NULLS LAST,
    task_no     NULLS LAST,
    transition_id NULLS LAST
