-- organization_group 削除クエリ
-- $1: organization_id
-- $2: organization_group_cd
DELETE FROM organization_group
WHERE organization_id = $1
  AND organization_group_cd = $2
