-- experiment_uncertainty_judge task単位の最新recorded_value一括取得
--
-- 指定トランジションの全プロパティについて、最新の recorded_value を一括取得する。
-- getTemplateData 内で定量評価の初期値を補完するために使用する。
--
-- パラメータ:
--   $1  organization_id
--   $2  project_id
--   $3  method_id
--   $4  task_no
--   $5  transition_id

SELECT DISTINCT ON (template_id, property_key, uncertainty_key)
    template_id      AS "templateId",
    property_key     AS "propertyKey",
    uncertainty_key  AS "uncertaintyKey",
    recorded_value   AS "recordedValue"
FROM experiment_uncertainty_judge
WHERE organization_id = $1
  AND project_id      = $2
  AND method_id       = $3
  AND task_no         = $4
  AND transition_id   = $5
ORDER BY
    template_id     ASC,
    property_key    ASC,
    uncertainty_key ASC,
    judge_seq       DESC
