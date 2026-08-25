-- scope_key に紐づく namespace_id を取得（Prefix 追加時の namespace 紐づけ用）
-- $1: organization_id
-- $2: scope_key（userId または organization_group_cd）
SELECT namespace_id
FROM namespace
WHERE organization_id = $1
  AND scope_key = $2
LIMIT 1
