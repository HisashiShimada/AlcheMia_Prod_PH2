-- Department 1件取得クエリ
-- 組織IDと部署CDでフィルタリングして1件取得
SELECT
  organization_id,
  department_cd,
  department_name,
  is_active,
  create_at,
  update_at
FROM department
WHERE organization_id = $1
  AND department_cd = $2
