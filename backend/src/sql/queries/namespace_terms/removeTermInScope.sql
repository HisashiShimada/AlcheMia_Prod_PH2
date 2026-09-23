-- 指定スコープ（namespace_id）の namespace_term を削除（用語共有の共有元削除用）
-- $1: organization_id
-- $2: namespace_id (共有元スコープの namespace_id)
-- $3: prefix
-- $4: localname
DELETE FROM namespace_term
WHERE organization_id = $1
  AND namespace_id    = $2
  AND prefix          = $3
  AND localname       = $4
