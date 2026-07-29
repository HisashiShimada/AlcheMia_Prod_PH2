-- uncertainty_criteria セレクター用取得クエリ
-- 不確かさ基準選択モーダル向け。有効（is_Invalid = FALSE）なレコードのみ取得。
-- intuition_selector を LEFT JOIN して定性評価の選択肢も同時に取得。
-- ORDER: uncertainty_key 昇順、同一キー内では version 降順（最新が先頭）、選択肢は display_order 昇順
SELECT
    uc.uncertainty_key               AS "uncertaintyKey"
  , uc.uncertainty_name              AS "uncertaintyName"
  , uc.name_space_id                 AS "nameSpaceId"
  , uc.version                       AS "version"
  , uc.evaluation_method             AS "evaluationMethod"
  , uc.xsi_type                      AS "xsiType"
  , uc.units                         AS "units"
  , uc.format_string                 AS "formatString"
  , uc.description                   AS "description"
  , ins.display_order                AS "displayOrder"
  , ins.value                        AS "selectorValue"
  , ins.display_color                AS "displayColor"
  , ins.is_default                   AS "isDefault"
FROM uncertainty_criteria uc
LEFT JOIN intuition_selector ins
  ON ins.organization_id  = uc.organization_id
 AND ins.name_space_id    = uc.name_space_id
 AND ins.uncertainty_key  = uc.uncertainty_key
 AND ins.version          = uc.version
WHERE uc.organization_id = $1
  AND uc.is_Invalid = FALSE
ORDER BY
    uc.uncertainty_key ASC
  , uc.version DESC
  , ins.display_order ASC
