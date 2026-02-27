-- 情報ダウンロード用：全組織統計情報取得クエリ
-- 組織ごとのプロジェクト数・アクティブユーザー数・総ユーザー数を集計して返す
SELECT
  o.organization_id,
  o.organization_cd,
  o.organization_display_name,
  o.organization_email,
  ou.user_name AS chief_user_name,
  c.corporation_name,
  COALESCE(p.project_count, 0)::int AS project_count,
  COALESCE(u.active_user_count, 0)::int AS active_user_count,
  COALESCE(u.total_user_count, 0)::int AS total_user_count
FROM organization o
LEFT JOIN organization_user ou
  ON ou.user_id = o.chief_user_id
  AND ou.organization_id = o.organization_id
LEFT JOIN corporation c
  ON c.corporation_id = o.corporation_id
LEFT JOIN (
  SELECT organization_id, COUNT(*) AS project_count
  FROM project
  GROUP BY organization_id
) p ON p.organization_id = o.organization_id
LEFT JOIN (
  SELECT
    organization_id,
    COUNT(*) FILTER (WHERE is_active = true) AS active_user_count,
    COUNT(*) AS total_user_count
  FROM organization_user
  GROUP BY organization_id
) u ON u.organization_id = o.organization_id
ORDER BY o.organization_cd ASC
