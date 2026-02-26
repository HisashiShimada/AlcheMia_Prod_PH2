-- Departmentアクティブ状態更新クエリ
UPDATE department
SET is_active = $1,
    update_user_id = $2,
    update_at = NOW()
WHERE organization_id = $3
  AND department_cd = $4
RETURNING
  organization_id,
  department_cd,
  department_name,
  is_active,
  create_at,
  update_at
