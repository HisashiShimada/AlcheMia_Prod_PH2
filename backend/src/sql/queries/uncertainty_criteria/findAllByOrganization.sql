-- uncertainty_criteria 一覧取得クエリ
-- 組織IDでフィルタリングし、不確かさ基準情報を取得
-- namespace_term を LEFT JOIN して表示名・説明を取得
-- namespace / organization_group / organization_user を LEFT JOIN してスコープ表示名を取得
-- ORDER: uncertainty_key 昇順、同一キー内では version 降順（最新が先頭）
-- $1: organization_id
-- $2: name_space_id（省略可。NULL の場合は全件取得）
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
  -- namespace_term カラム（Key属性設定に紐づく表示名・説明）
  , nt.display_name                  AS "termDisplayName"
  , nt.description                   AS "termDescription"
  -- スコープ情報（namespace.scope_key → organization_group_name または user_name）
  , n.scope_key                      AS "scopeKey"
  , COALESCE(og.organization_group_name, ou.user_name, '') AS "scopeName"
FROM uncertainty_criteria uc
LEFT JOIN namespace_term nt
  ON  nt.organization_id = uc.organization_id
  AND nt.prefix || ':' || nt.localname = uc.uncertainty_key
LEFT JOIN namespace n
  ON  n.organization_id = uc.organization_id
  AND n.namespace_id    = uc.name_space_id
LEFT JOIN organization_group og
  ON  og.organization_id        = uc.organization_id
  AND og.organization_group_cd  = n.scope_key
LEFT JOIN organization_user ou
  ON  ou.organization_id = uc.organization_id
  AND ou.user_id         = n.scope_key
WHERE uc.organization_id = $1
  AND ($2::text IS NULL OR uc.name_space_id = $2)
ORDER BY uc.uncertainty_key ASC, uc.version DESC
