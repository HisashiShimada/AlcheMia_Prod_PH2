-- Corporation名存在確認クエリ（除外ID指定あり・更新時使用）
-- 大文字小文字を区別しない比較
SELECT EXISTS (
  SELECT 1
  FROM corporation
  WHERE LOWER(corporation_name) = LOWER($1)
    AND corporation_id != $2
) AS exists
