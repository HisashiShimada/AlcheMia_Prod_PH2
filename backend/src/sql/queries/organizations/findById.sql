-- Organization 1件取得クエリ
-- organization_user・corporationをLEFT JOINして1件取得
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
  o.update_at
FROM organization o
LEFT JOIN organization_user ou
  ON ou.user_id = o.chief_user_id
  AND ou.organization_id = o.organization_id
LEFT JOIN corporation c
  ON c.corporation_id = o.corporation_id
WHERE o.organization_id = $1
