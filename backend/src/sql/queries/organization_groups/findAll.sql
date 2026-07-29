-- organization_group 一覧取得クエリ
-- 組織IDでフィルタリングし、組織階層グループ情報を取得
-- DDL: docs/design/db/ddl/organization_group.sql
SELECT
  organization_id
  , organization_group_cd
  , organization_group_name
  , chief_user_id
  , parent_group_cd
  , layer
  , create_user_id
  , create_at
  , update_user_id
  , update_at
FROM organization_group
WHERE organization_id = $1
ORDER BY organization_group_cd ASC
