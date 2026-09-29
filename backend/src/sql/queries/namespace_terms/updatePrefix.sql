-- prefix テーブルの prefix と description を更新する
-- prefix 変更時は updateTermPrefix.sql を先に実行すること（FK制約のため）
-- $1: new_prefix（変更後の prefix 文字列）
-- $2: description（変更後の description。NULL を渡すと NULL に更新される）
-- $3: organization_id
-- $4: current_prefix（変更前の prefix 文字列）
-- $5: namespace_id（NULLの場合は namespace_id 条件なし・後方互換）
UPDATE prefix
SET
  prefix      = $1
  , description = $2
  , update_at  = CURRENT_TIMESTAMP
WHERE organization_id = $3
  AND prefix          = $4
  AND ($5::VARCHAR IS NULL OR namespace_id = $5)
RETURNING
  (
    SELECT n.namespace_id
    FROM namespace n
    WHERE n.organization_id = $3
      AND n.namespace_id = prefix.namespace_id
    LIMIT 1
  ) AS namespace_id
  , prefix
  , (
    SELECT n.uri
    FROM namespace n
    WHERE n.organization_id = $3
      AND n.namespace_id = prefix.namespace_id
    LIMIT 1
  ) AS uri
  , (
    SELECT n.scope_key
    FROM namespace n
    WHERE n.organization_id = $3
      AND n.namespace_id = prefix.namespace_id
    LIMIT 1
  ) AS scope_key
