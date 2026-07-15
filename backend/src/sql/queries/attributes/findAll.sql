-- Attributeマスタ全件取得
-- organization_id でフィルタリングし、組織グループ情報を結合して取得
SELECT
  a.attribute_name,
  a.attribute_value,
  a.attribute_remark,
  a.organization_group_cd,
  d.organization_group_name,
  a.is_active,
  a.update_at
FROM attribute a
LEFT JOIN organization_group d
  ON a.organization_id = d.organization_id
  AND a.organization_group_cd = d.organization_group_cd
WHERE a.organization_id = $1
ORDER BY a.attribute_name ASC, a.attribute_value ASC
