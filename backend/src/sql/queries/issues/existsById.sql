-- 問題IDが存在するかチェックする
-- existsById() メソッドで使用
SELECT EXISTS (
  SELECT 1
  FROM issue
  WHERE organization_id = $1
    AND issue_id = $2
) as exists
