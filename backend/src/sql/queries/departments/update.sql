-- Department更新クエリ
-- $1: organization_id, $2: department_cd, $3: department_name (null=変更なし), $4: is_active (null=変更なし), $5: update_user_id
UPDATE department
SET
  department_name = COALESCE($3, department_name),
  is_active       = COALESCE($4, is_active),
  update_user_id  = $5,
  update_at       = NOW()
WHERE organization_id = $1
  AND department_cd   = $2
RETURNING
  organization_id,
  department_cd,
  department_name,
  is_active,
  create_at,
  update_at
