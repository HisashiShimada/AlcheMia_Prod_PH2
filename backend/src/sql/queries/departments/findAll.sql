-- Department一覧取得クエリ
-- 組織IDでフィルタリングし、部署情報を取得
SELECT 
  organization_id,
  department_cd,
  department_name,
  is_active,
  create_at,
  update_at
FROM department
WHERE organization_id = $1
ORDER BY department_cd ASC
