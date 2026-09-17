-- 用語を共有先スコープへ INSERT する（用語共有用）
-- 共有先 namespace_id（$2）に指定 prefix:localname の用語を INSERT
-- 同名用語が既に存在する場合は ON CONFLICT DO NOTHING でスキップし、RETURNING で挿入済み localname を返す
--
-- Parameters:
--   $1 organization_id  : 組織ID (UUID)
--   $2 target_namespace_id : 共有先の namespace_id
--   $3 prefix           : 対象 prefix
--   $4 localname        : 対象 localname
INSERT INTO namespace_term (
  organization_id,
  namespace_id,
  prefix,
  localname,
  display_name,
  description,
  xsi_type,
  units,
  has_directive_term,
  is_active,
  create_at,
  update_at
)
SELECT
  $1::uuid                        AS organization_id,
  $2                              AS namespace_id,
  src.prefix,
  src.localname,
  src.display_name,
  src.description,
  src.xsi_type,
  src.units,
  src.has_directive_term,
  src.is_active,
  CURRENT_TIMESTAMP               AS create_at,
  CURRENT_TIMESTAMP               AS update_at
FROM namespace_term src
WHERE src.organization_id = $1::uuid
  AND src.prefix          = $3
  AND src.localname       = $4
ON CONFLICT (organization_id, namespace_id, prefix, localname) DO NOTHING
RETURNING localname
