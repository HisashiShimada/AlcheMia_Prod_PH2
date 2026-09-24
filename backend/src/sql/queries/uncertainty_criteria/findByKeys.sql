-- 不確かさ基準キー複数件取得クエリ
-- キーの配列でフィルタし、各キーの最新バージョンを1件取得する
-- namespace_term を LEFT JOIN して表示名（display_name）を取得する
SELECT DISTINCT ON (uc.uncertainty_key)
  uc.uncertainty_key AS key,
  nt.display_name    AS uncertainty_name
FROM uncertainty_criteria uc
LEFT JOIN namespace_term nt
  ON  nt.organization_id               = uc.organization_id
  AND nt.namespace_id                  = uc.name_space_id
  AND nt.prefix || ':' || nt.localname = uc.uncertainty_key
WHERE uc.organization_id = $1
  AND uc.uncertainty_key = ANY($2::text[])
  AND uc.is_Invalid = FALSE
ORDER BY uc.uncertainty_key, uc.version DESC

