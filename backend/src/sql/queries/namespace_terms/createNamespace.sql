-- namespace テーブルに1件 INSERT（名前空間の新規登録）
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
  $1, $2, $3, FALSE, $4, $5, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, namespace_id) DO NOTHING
