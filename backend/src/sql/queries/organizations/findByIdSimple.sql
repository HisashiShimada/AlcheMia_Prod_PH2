-- 組織ID で組織レコードを取得するクエリ（シンプル版）
SELECT
  organization_id,
  organization_cd,
  organization_display_name,
  is_entry,
  use_deemed_progress,
  COALESCE(default_retention_days, 365) AS default_retention_days
FROM organization
WHERE organization_id = $1
