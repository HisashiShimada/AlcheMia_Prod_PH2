-- organization_group 一覧取得クエリ
-- 組織IDでフィルタリングし、検索条件（search）に対応
-- $1: organization_id
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
ORDER BY layer ASC NULLS LAST, organization_group_cd ASC
