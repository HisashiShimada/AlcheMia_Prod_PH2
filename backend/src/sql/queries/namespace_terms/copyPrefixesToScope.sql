-- 選択した prefix 行を対象スコープへコピーする
-- 同一スコープ（対象 namespace_id）に既に同じ prefix が存在する場合は DO NOTHING でスキップ
--
-- Parameters:
--   $1 organization_id  : 組織ID (UUID)
--   $2 targetScopeKey   : コピー先スコープキー (organization_group_cd または userId)
--   $3 userId           : 操作ユーザーID (create_user_id に設定)
--   $4 prefixes         : コピー対象の prefix 名の配列 (varchar[])
INSERT INTO prefix (
  organization_id,
  namespace_id,
  prefix,
  description,
  is_active,
  create_user_id,
  update_user_id,
  create_at,
  update_at
)
SELECT
  $1::uuid                                                          AS organization_id,
  (
    SELECT namespace_id
    FROM namespace
    WHERE organization_id = $1::uuid
      AND scope_key = $2
    LIMIT 1
  )                                                                 AS namespace_id,
  p.prefix,
  p.description,
  COALESCE(p.is_active, TRUE)                                       AS is_active,
  $3                                                                AS create_user_id,
  $3                                                                AS update_user_id,
  NOW()                                                             AS create_at,
  NOW()                                                             AS update_at
FROM prefix p
WHERE p.organization_id = $1::uuid
  AND p.prefix = ANY($4::varchar[])
ON CONFLICT (organization_id, namespace_id, prefix) DO NOTHING
RETURNING prefix
