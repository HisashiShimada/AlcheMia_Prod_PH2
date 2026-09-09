-- 複数の uncertainty_key に対応する全バージョンの詳細を一括取得するクエリ
-- エクスポート機能で選択行を一括取得する際に使用する
-- intuition_selector を LEFT JOIN して定性評価の選択肢も取得する
--
-- パラメータ:
--   $1  organization_id
--   $2  uncertainty_keys の配列 (uncertainty_key[])
SELECT
    uc.uncertainty_key               AS "uncertaintyKey"
  , uc.uncertainty_name              AS "uncertaintyName"
  , uc.name_space_id                 AS "nameSpaceId"
  , uc.version                       AS version
  , uc.evaluation_method             AS "evaluationMethod"
  , uc.is_Invalid                    AS "isInvalid"
  , uc.inheritance_uncertainty_key   AS "inheritanceUncertaintyKey"
  , uc.xsi_type                      AS "xsiType"
  , uc.units                         AS units
  , uc.scale_factor                  AS "scaleFactor"
  , uc.format_string                 AS "formatString"
  , uc.tolerance_upper               AS "toleranceUpper"
  , uc.tolerance_lower               AS "toleranceLower"
  , uc.description                   AS description
  -- intuition_selector カラム（定性評価の選択肢）
  , ins.display_order                AS "displayOrder"
  , ins.value                        AS "selectorValue"
  , ins.display_color                AS "displayColor"
FROM uncertainty_criteria uc
LEFT JOIN intuition_selector ins
  ON  ins.organization_id  = uc.organization_id
  AND ins.name_space_id    = uc.name_space_id
  AND ins.uncertainty_key  = uc.uncertainty_key
  AND ins.version          = uc.version
WHERE uc.organization_id = $1
  AND uc.uncertainty_key = ANY($2::text[])
ORDER BY uc.uncertainty_key ASC, uc.version DESC, ins.display_order ASC NULLS LAST
