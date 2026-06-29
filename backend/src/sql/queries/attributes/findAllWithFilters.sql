-- Attributeマスタ フィルタ付き一覧取得
-- WHERE 1=1 および ORDER BY はリポジトリ側で動的に置換される
SELECT
  a.attribute_name,
  a.attribute_value,
  a.attribute_remark,
  a.department_cd,
  d.department_name,
  a.is_active,
  a.update_at
FROM attribute a
LEFT JOIN department d
  ON a.organization_id = d.organization_id
  AND a.department_cd = d.department_cd
WHERE 1=1
ORDER BY a.attribute_name ASC, a.attribute_value ASC
