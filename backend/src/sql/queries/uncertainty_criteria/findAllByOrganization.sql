-- uncertainty_criteria 一覧取得クエリ
-- 組織IDでフィルタリングし、不確かさ基準情報を取得
-- ORDER: uncertainty_key 昇順、同一キー内では version 降順（最新が先頭）
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
  , uc.format_string                 AS "formatString"
  , uc.description                   AS description
FROM uncertainty_criteria uc
WHERE uc.organization_id = $1
ORDER BY uc.uncertainty_key ASC, uc.version DESC
