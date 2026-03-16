-- Organization一覧取得クエリ（ベースクエリ）
-- organization_user・corporationをLEFT JOINして取得
-- 動的フィルターはTypeScript側で追加
SELECT
  o.organization_id,
  o.organization_cd,
  o.organization_display_name,
  o.organization_email,
  o.chief_user_id,
  ou.user_name AS chief_user_name,
  o.corporation_id,
  c.corporation_name,
  o.is_entry,
  o.use_deemed_progress,
  o.is_active,
  o.contract_capacity,
  o.contract_users,
  o.contract_projects,
  o.default_retention_days,
  o.update_at
FROM organization o
LEFT JOIN organization_user ou
  ON ou.user_id = o.chief_user_id
  AND ou.organization_id = o.organization_id
LEFT JOIN corporation c
  ON c.corporation_id = o.corporation_id
WHERE 1=1
ORDER BY o.organization_cd ASC
