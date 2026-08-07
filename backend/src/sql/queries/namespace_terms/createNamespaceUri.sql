-- namespace テーブルに URI のみ INSERT（組織・ユーザー・チーム作成時の自動登録用）
-- prefix テーブルへの登録は行わない
-- $1: organization_id
-- $2: namespace_id
-- $3: uri
-- $4: create_user_id
-- $5: scope_key（NULL = 組織/ユーザーレベル、organization_group_cd = チームレベル）
INSERT INTO namespace (
  organization_id
  , namespace_id
  , uri
  , global_flg
  , scope_key
  , create_user_id
  , create_at
  , update_user_id
  , update_at
) VALUES (
  $1, $2, $3, FALSE, $5, $4, CURRENT_TIMESTAMP, $4, CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, namespace_id) DO NOTHING
