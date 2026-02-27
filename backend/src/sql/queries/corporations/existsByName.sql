-- Corporation名存在確認クエリ（除外ID指定なし）
SELECT EXISTS (
  SELECT 1
  FROM corporation
  WHERE corporation_name = $1
) AS exists
