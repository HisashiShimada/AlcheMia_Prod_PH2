-- prefix テーブルに1件 INSERT（名前空間の新規登録時）
INSERT INTO prefix (
  organization_id
  , namespace_id
  , prefix
  , description
  , is_active
  , create_user_id
  , create_at
  , update_user_id
  , update_at
) VALUES (
  $1, $2, $3, $4, TRUE, $5, CURRENT_TIMESTAMP, $5, CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, namespace_id, prefix) DO NOTHING
