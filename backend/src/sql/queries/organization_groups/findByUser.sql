-- organization_group ユーザー所属グループ取得クエリ
-- ログインユーザーが所属するグループと、その全祖先グループを取得する（ツリー表示用）
-- DDL: docs/design/db/ddl/organization_group.sql
--      docs/design/db/ddl/organization_group_user.sql
--
-- $1: organization_id
-- $2: user_id
WITH RECURSIVE
  -- ユーザーが直接所属するグループ
  user_groups AS (
    SELECT og.organization_group_cd
    FROM organization_group og
    INNER JOIN organization_group_user ogu
      ON  og.organization_id       = ogu.organization_id
      AND og.organization_group_cd = ogu.organization_group_cd
    WHERE og.organization_id = $1
      AND ogu.user_id        = $2
  ),
  -- ユーザー所属グループ + すべての祖先グループ（ツリー構造を維持するため）
  ancestors AS (
    -- ユーザーが直接所属するグループ
    SELECT og.*
    FROM organization_group og
    INNER JOIN user_groups ug ON og.organization_group_cd = ug.organization_group_cd
    WHERE og.organization_id = $1

    UNION ALL

    -- 親グループを再帰的に辿る
    SELECT parent.*
    FROM organization_group parent
    INNER JOIN ancestors child ON parent.organization_group_cd = child.parent_group_cd
    WHERE parent.organization_id = $1
  )
SELECT DISTINCT
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
FROM ancestors
ORDER BY organization_group_cd ASC
