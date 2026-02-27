-- Corporation名存在確認クエリ（除外ID指定あり・更新時使用）
SELECT EXISTS (
  SELECT 1
  FROM corporation
  WHERE corporation_name = $1
    AND corporation_id != $2
) AS exists
