-- organization_group 単件取得クエリ
-- $1: organization_id
-- $2: organization_group_cd
SELECT
  og.organization_id
  , og.organization_group_cd
  , og.organization_group_name
  , og.chief_user_id
  , ou.user_name AS chief_user_name
  , og.parent_group_cd
  , pg.organization_group_name AS parent_group_name
  , og.layer
  , og.is_active
  , og.create_user_id
  , og.create_at
  , og.update_user_id
  , og.update_at
  , ns.uri AS namespace_uri
FROM organization_group og
LEFT JOIN organization_user ou
  ON og.organization_id = ou.organization_id
  AND og.chief_user_id = ou.user_id
LEFT JOIN organization_group pg
  ON og.organization_id = pg.organization_id
  AND og.parent_group_cd = pg.organization_group_cd
LEFT JOIN namespace ns
  ON og.organization_id = ns.organization_id
  AND ns.scope_key = og.organization_group_cd
WHERE og.organization_id = $1
  AND og.organization_group_cd = $2
