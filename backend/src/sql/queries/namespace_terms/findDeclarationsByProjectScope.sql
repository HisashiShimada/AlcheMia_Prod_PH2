-- プロジェクトスコープで絞り込んだ namespace 宣言一覧を取得
-- - orgGroupCd が指定された場合は scope_key = orgGroupCd の namespace を返す
-- - orgGroupCd が NULL の場合は organization_id 配下の全件を返す
-- （グローバル名前空間はファイルサーバ管理に移行したため global_flg 条件・カラムを削除）
SELECT
  p.prefix
  , n.uri
FROM prefix p
INNER JOIN namespace n
  ON p.organization_id = n.organization_id
  AND p.namespace_id = n.namespace_id
WHERE p.organization_id = $1
  AND p.is_active = TRUE
  AND (
        ($2::VARCHAR IS NULL)
        OR n.scope_key = $2
      )
ORDER BY prefix ASC
