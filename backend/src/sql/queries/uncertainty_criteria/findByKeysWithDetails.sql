-- 不確かさ基準キー複数件詳細取得クエリ
-- キーの配列でフィルタし、各キーの最新バージョンを1件取得する
-- evaluation_method / termDisplayName / intuition_selector（選択肢）も返す
SELECT DISTINCT ON (uc.uncertainty_key)
  uc.uncertainty_key            AS "uncertaintyKey",
  uc.uncertainty_name           AS "uncertaintyName",
  uc.evaluation_method          AS "evaluationMethod",
  nt.display_name               AS "termDisplayName",
  COALESCE(
    json_agg(
      json_build_object(
        'displayOrder',  ins.display_order,
        'selectorValue', ins.value,
        'displayColor',  ins.display_color
      ) ORDER BY ins.display_order
    ) FILTER (WHERE ins.display_order IS NOT NULL),
    '[]'::json
  )                             AS "qualitativeOptions"
FROM uncertainty_criteria uc
LEFT JOIN namespace_term nt
  ON  nt.organization_id               = uc.organization_id
  AND nt.namespace_id                  = uc.name_space_id
  AND nt.prefix || ':' || nt.localname = uc.uncertainty_key
LEFT JOIN intuition_selector ins
  ON ins.organization_id   = uc.organization_id
  AND ins.name_space_id    = uc.name_space_id
  AND ins.uncertainty_key  = uc.uncertainty_key
  AND ins.version          = uc.version
WHERE uc.organization_id = $1
  AND uc.uncertainty_key = ANY($2::text[])
  AND uc.is_Invalid = FALSE
GROUP BY
  uc.uncertainty_key,
  uc.uncertainty_name,
  uc.evaluation_method,
  uc.name_space_id,
  uc.version,
  nt.display_name
ORDER BY uc.uncertainty_key, uc.version DESC
