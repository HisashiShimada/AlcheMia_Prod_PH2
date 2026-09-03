-- experiment_instruction_detail プロジェクト全件取得（実験指示タブ表示用）
--
-- 指定プロジェクトの全 instruction_detail を取得する。
-- 実験指示タブで定性評価情報（基準名・付与値）をフィールドにマッピングするために使用する。
--
-- パラメータ:
--   $1  organization_id
--   $2  project_id

SELECT
    organization_id       AS "organization_id",
    project_id            AS "project_id",
    method_id             AS "method_id",
    task_no               AS "task_no",
    transition_id         AS "transition_id",
    template_name         AS "template_name",
    prop_key              AS "prop_key",
    xsi_type              AS "xsi_type",
    expected_value        AS "expected_value",
    actual_value          AS "actual_value",
    name_space_id         AS "name_space_id",
    uncertainty_key       AS "uncertainty_key",
    uncertainty_assigned_value AS "uncertainty_assigned_value",
    uncertainty_assigned_by    AS "uncertainty_assigned_by",
    uncertainty_assigned_at    AS "uncertainty_assigned_at",
    uncertainty_comment        AS "uncertainty_comment",
    create_user_id        AS "create_user_id",
    create_at             AS "create_at",
    update_user_id        AS "update_user_id",
    update_at             AS "update_at"
FROM experiment_instruction_detail
WHERE organization_id = $1
  AND project_id      = $2
ORDER BY method_id ASC, task_no ASC, template_name ASC, prop_key ASC
