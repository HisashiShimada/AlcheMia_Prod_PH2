-- organization_user物理削除クエリ
DELETE FROM organization_user
WHERE organization_id = $1
  AND user_id = $2
