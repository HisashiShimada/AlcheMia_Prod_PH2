-- uncertainty_criteria セレクター用取得クエリ
-- 不確かさ基準選択モーダル向け。有効（is_Invalid = FALSE）なレコードのみ取得。
-- intuition_selector を LEFT JOIN して定性評価の選択肢も同時に取得。
-- ORDER: uncertainty_key 昇順、同一キー内では version 降順（最新が先頭）、選択肢は display_order 昇順
--
-- $1: organization_id
-- $2: organizationGroupCd（optional: NULL の場合は全件取得）
-- $3: userId（optional: NULL の場合は Personal スコープをスキップ）
--
-- organizationGroupCd が指定された場合、以下のスコープに属する name_space_id のみを対象とする:
--   1. 指定グループ自身が所有する namespace（scope_key = $2 で直接参照）
--   2. 指定グループの祖先グループが所有する namespace（WITH RECURSIVE で取得）
--   3. Personal スコープの namespace（namespace.scope_key = $3）
--   4. 組織共通の namespace（namespace.scope_key IS NULL）
-- organizationGroupCd が NULL の場合は組織内全件を返す（後方互換）
WITH RECURSIVE ancestors AS (
  -- 基底ケース: 指定グループ CD
  SELECT
    og.organization_group_cd
    , og.parent_group_cd
    , og.organization_id
  FROM organization_group og
  WHERE og.organization_id       = $1
    AND og.organization_group_cd = $2

  UNION ALL

  -- 再帰ケース: 親グループを辿る
  SELECT
    og2.organization_group_cd
    , og2.parent_group_cd
    , og2.organization_id
  FROM organization_group og2
  INNER JOIN ancestors anc
    ON og2.organization_id       = anc.organization_id
   AND og2.organization_group_cd = anc.parent_group_cd
)
SELECT
    uc.uncertainty_key               AS "uncertaintyKey"
  , uc.uncertainty_name              AS "uncertaintyName"
  , uc.name_space_id                 AS "nameSpaceId"
  , uc.version                       AS "version"
  , uc.evaluation_method             AS "evaluationMethod"
  , uc.xsi_type                      AS "xsiType"
  , uc.units                         AS "units"
  , uc.scale_factor                  AS "scaleFactor"
  , uc.format_string                 AS "formatString"
  , uc.tolerance_upper               AS "toleranceUpper"
  , uc.tolerance_lower               AS "toleranceLower"
  , uc.description                   AS "description"
  -- スコープ情報（namespace.scope_key → organization_group_name または user_name）
  , ns.scope_key                     AS "scopeKey"
  , COALESCE(og.organization_group_name, ou.user_name, '') AS "scopeName"
  , ins.display_order                AS "displayOrder"
  , ins.value                        AS "selectorValue"
  , ins.display_color                AS "displayColor"
FROM uncertainty_criteria uc
JOIN namespace ns
  ON ns.organization_id = uc.organization_id
 AND ns.namespace_id    = uc.name_space_id
LEFT JOIN organization_group og
  ON  og.organization_id       = uc.organization_id
  AND og.organization_group_cd = ns.scope_key
LEFT JOIN organization_user ou
  ON  ou.organization_id = uc.organization_id
  AND ou.user_id         = ns.scope_key
LEFT JOIN intuition_selector ins
  ON ins.organization_id  = uc.organization_id
 AND ins.name_space_id    = uc.name_space_id
 AND ins.uncertainty_key  = uc.uncertainty_key
 AND ins.version          = uc.version
WHERE uc.organization_id = $1
  AND uc.is_Invalid = FALSE
  AND (
    -- organizationGroupCd が未指定（NULL）の場合は全件取得（後方互換）
    $2 IS NULL
    OR
    -- 指定グループ自身が所有する namespace（ancestors CTE 非依存で確実にマッチ）
    ns.scope_key = $2
    OR
    -- 指定グループの祖先グループが所有する namespace
    ns.scope_key IN (SELECT organization_group_cd FROM ancestors)
    OR
    -- Personal スコープの namespace（userId が指定されている場合のみ）
    ($3 IS NOT NULL AND ns.scope_key = $3)
    OR
    -- 組織共通の namespace（scope_key が NULL = 組織全体共通）
    ns.scope_key IS NULL
  )
ORDER BY
    uc.uncertainty_key ASC
  , uc.version DESC
  , ins.display_order ASC
