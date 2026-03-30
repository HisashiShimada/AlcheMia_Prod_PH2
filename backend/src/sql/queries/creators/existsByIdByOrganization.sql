-- Creator存在確認クエリ（組織スコープ）
SELECT EXISTS (
  SELECT 1
  FROM creator
  WHERE organization_id = $1
    AND creator_id = $2
) AS exists
