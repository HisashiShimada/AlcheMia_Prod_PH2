-- Department存在確認クエリ
SELECT EXISTS (
  SELECT 1
  FROM department
  WHERE organization_id = $1
    AND department_cd = $2
) AS exists
