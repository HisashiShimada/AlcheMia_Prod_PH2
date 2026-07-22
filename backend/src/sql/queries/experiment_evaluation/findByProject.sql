-- experiment_evaluation: プロジェクト単位で評価結果を取得
SELECT
    ee.organization_id,
    ee.project_id,
    ee.evaluation_unit,
    ee.method_id,
    ee.task_no,
    ee.transition_id,
    ee.name_space_id,
    ee.uncertainty_key,
    ee.uc_version,
    ee.evaluation_value,
    ee.comment,
    ee.uncertainty_xml,
    ee.evaluated_by,
    ee.evaluated_at,
    ee.create_at,
    ee.update_at,
    -- intuition_selectorから表示色を取得
    ins.display_color
FROM experiment_evaluation ee
LEFT JOIN intuition_selector ins
    ON ins.organization_id = ee.organization_id
    AND ins.name_space_id  = ee.name_space_id
    AND ins.uncertainty_key = ee.uncertainty_key
    AND ins.version        = ee.uc_version
    AND ins.value          = ee.evaluation_value
WHERE ee.organization_id = $1
  AND ee.project_id      = $2
ORDER BY
    ee.evaluation_unit,
    ee.method_id,
    ee.task_no,
    ee.transition_id
