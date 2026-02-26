-- 組織削除（物理削除）
DELETE FROM organization
WHERE organization_id = $1
