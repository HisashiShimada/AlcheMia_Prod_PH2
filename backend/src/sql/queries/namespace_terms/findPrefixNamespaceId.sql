-- prefix に対応する namespace_id を取得
-- 組織グループ（organization_group）を優先して返す（ORDER BY）
-- prefix が複数スコープ（例: グループ001 + ユーザ004）に存在する場合に
-- 上位階層（組織グループ）の namespace_id を安定して返すための措置
SELECT p.namespace_id
FROM prefix p
LEFT JOIN organization_group og
  ON og.organization_id = p.organization_id
  AND og.organization_group_cd = p.scope_key
WHERE p.organization_id = $1
  AND p.prefix = $2
ORDER BY
  CASE WHEN og.organization_group_cd IS NOT NULL THEN 0 ELSE 1 END,
  p.namespace_id
LIMIT 1
