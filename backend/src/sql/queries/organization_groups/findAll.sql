-- organization_group 一覧取得クエリ
-- 組織IDでフィルタリングし、組織階層グループ情報を取得（メンバー数・代表者名・namespace URI を含む）
-- DDL: docs/design/db/ddl/organization_group.sql
SELECT
  og.organization_id
  , og.organization_group_cd
  , og.organization_group_name
  , og.chief_user_id
  , ou.user_name AS chief_user_name
  , og.parent_group_cd
  , og.layer
  , og.is_active
  , og.create_user_id
  , og.create_at
  , og.update_user_id
  , og.update_at
  , COALESCE(m.member_count, 0)::int AS member_count
  , ns.uri AS namespace_uri
FROM organization_group og
LEFT JOIN organization_user ou
  ON og.organization_id = ou.organization_id
  AND og.chief_user_id = ou.user_id
LEFT JOIN (
  SELECT
    organization_id
    , organization_group_cd
    , COUNT(*) AS member_count
  FROM organization_group_user
  GROUP BY organization_id, organization_group_cd
) m
  ON og.organization_id = m.organization_id
  AND og.organization_group_cd = m.organization_group_cd
LEFT JOIN namespace ns
  ON og.organization_id = ns.organization_id
  AND ns.scope_key = og.organization_group_cd
WHERE og.organization_id = $1
ORDER BY og.organization_group_cd ASC
