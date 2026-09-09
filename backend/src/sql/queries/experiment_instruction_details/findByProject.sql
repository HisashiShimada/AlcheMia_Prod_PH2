-- experiment_instruction_detail プロジェクト全件取得（実験指示タブ表示用）
--
-- 指定プロジェクトの全 instruction_detail を取得する。
-- template_data と LEFT JOIN して place_id を取得する（訂正処理で必要）。
-- 1つの template_id に複数の place_id が紐づく場合は MIN で代表1件を使用する。
--
-- パラメータ:
--   $1  organization_id
--   $2  project_id

SELECT
    eid.organization_id       AS "organization_id",
    eid.project_id            AS "project_id",
    eid.method_id             AS "method_id",
    eid.task_no               AS "task_no",
    eid.transition_id         AS "transition_id",
    eid.template_id           AS "template_id",
    eid.template_name         AS "template_name",
    eid.transition_name       AS "transition_name",
    eid.prop_key              AS "prop_key",
    eid.xsi_type              AS "xsi_type",
    eid.expected_value        AS "expected_value",
    eid.actual_value          AS "actual_value",
    eid.name_space_id         AS "name_space_id",
    eid.uncertainty_key       AS "uncertainty_key",
    eid.uncertainty_assigned_value AS "uncertainty_assigned_value",
    eid.uncertainty_assigned_by    AS "uncertainty_assigned_by",
    eid.uncertainty_assigned_at    AS "uncertainty_assigned_at",
    eid.uncertainty_comment        AS "uncertainty_comment",
    eid.create_user_id        AS "create_user_id",
    eid.create_at             AS "create_at",
    eid.update_user_id        AS "update_user_id",
    eid.update_at             AS "update_at",
    -- template_data から place_id を取得（訂正処理で使用）
    -- 1テンプレートに複数 place_id が存在する場合は最小値を代表として使用
    td_agg.place_id           AS "place_id"
FROM experiment_instruction_detail eid
LEFT JOIN (
    SELECT
        organization_id,
        project_id,
        method_id,
        task_no,
        property_set->>'templateId' AS template_id,
        MIN(place_id)               AS place_id
    FROM template_data
    WHERE organization_id = $1
      AND project_id      = $2
      AND property_set->>'templateId' IS NOT NULL
    GROUP BY organization_id, project_id, method_id, task_no, property_set->>'templateId'
) td_agg
    ON  td_agg.organization_id = eid.organization_id
    AND td_agg.project_id      = eid.project_id
    AND td_agg.method_id       = eid.method_id
    AND td_agg.task_no         = eid.task_no
    AND td_agg.template_id     = eid.template_id
WHERE eid.organization_id = $1
  AND eid.project_id      = $2
ORDER BY eid.method_id ASC, eid.task_no ASC, eid.template_id ASC, eid.prop_key ASC
