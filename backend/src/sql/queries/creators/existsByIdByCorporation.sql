-- Creator存在確認クエリ（法人スコープ）
SELECT EXISTS (
  SELECT 1
  FROM creator
  WHERE corporation_id = $1
    AND creator_id = $2
) AS exists
