-- namespace テーブルに URI のみ INSERT（組織・ユーザー作成時の自動登録用）
-- prefix テーブルへの登録は行わない
-- $5: scope_key = userId（個人名前空間として検索できるよう create_user_id と同値を設定）
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
