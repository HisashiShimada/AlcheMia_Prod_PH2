-- Attributeマスタ フィルタ付き一覧取得
-- WHERE 1=1 および ORDER BY はリポジトリ側で動的に置換される
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
WHERE 1=1
ORDER BY a.attribute_name ASC, a.attribute_value ASC
