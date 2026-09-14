-- namespace テーブルに URI のみ INSERT（組織・ユーザー・チーム作成時の自動登録用）
-- prefix テーブルへの登録は行わない
-- $5: scope_key = userId（個人名前空間として検索できるよう create_user_id と同値を設定）
-- ON CONFLICT:
--   scope_key が NOT NULL の場合: (organization_id, scope_key) の重複はスキップ（冪等）
--   scope_key が NULL の場合: 上記の ON CONFLICT は適用されず複数存在可能
INSERT INTO namespace (
  organization_id
  , namespace_id
  , uri
  , scope_key
  , create_user_id
  , create_at
  , update_user_id
  , update_at
) VALUES (
  $1, $2, $3, $5, $4, CURRENT_TIMESTAMP, $4, CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, scope_key)
WHERE scope_key IS NOT NULL
DO NOTHING
