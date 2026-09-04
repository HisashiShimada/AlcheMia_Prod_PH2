-- uncertainty_criteria 詳細取得クエリ（intuition_selector を LEFT JOIN）
-- 組織ID・uncertainty_key・version で1件取得し、定性評価の選択肢も同時に取得
-- uncertainty_criteria 側: 1行
-- intuition_selector 側: 0行〜N行（定量の場合は0行）
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
  , ins.is_default                   AS "isDefault"
FROM uncertainty_criteria uc
LEFT JOIN intuition_selector ins
  ON  ins.organization_id  = uc.organization_id
  AND ins.name_space_id    = uc.name_space_id
  AND ins.uncertainty_key  = uc.uncertainty_key
  AND ins.version          = uc.version
WHERE uc.organization_id = $1
  AND uc.uncertainty_key = $2
  AND uc.version         = $3
ORDER BY ins.display_order ASC NULLS LAST
