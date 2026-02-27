-- 組織アクティブ状態更新
UPDATE organization
SET is_active = $1,
    update_user_id = $2,
    update_at = NOW()
WHERE organization_id = $3
RETURNING
  organization_id
