-- Department物理削除クエリ
DELETE FROM department
WHERE organization_id = $1
  AND department_cd = $2
