-- 不確かさ基準キー複数件取得クエリ
-- キーの配列でフィルタし、各キーの最新バージョンを1件取得する
SELECT DISTINCT ON (uncertainty_key)
  uncertainty_key AS key,
  uncertainty_name
FROM uncertainty_criteria
WHERE organization_id = $1
  AND uncertainty_key = ANY($2::text[])
  AND is_Invalid = FALSE
ORDER BY uncertainty_key, version DESC
