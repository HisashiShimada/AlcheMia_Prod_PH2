-- プロジェクトスコープで絞り込んだ namespace 宣言一覧を取得
-- - global_flg = TRUE の namespace に紐づく prefix は常に含める
-- - orgGroupCd が指定された場合は scope_key = orgGroupCd の namespace も含める
-- - orgGroupCd が NULL の場合は organization_id 配下の全件を返す
SELECT
  p.prefix
  , n.uri
  , COALESCE(n.global_flg, FALSE) AS "globalFlg"
FROM prefix p
INNER JOIN namespace n
  ON p.organization_id = n.organization_id
  AND p.namespace_id = n.namespace_id
WHERE p.organization_id = $1
  AND p.is_active = TRUE
  AND (
        n.global_flg = TRUE
        OR ($2::VARCHAR IS NULL)
        OR n.scope_key = $2
      )
ORDER BY p.prefix ASC
