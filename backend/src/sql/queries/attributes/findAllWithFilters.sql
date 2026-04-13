-- Attributeフィルタ付き一覧取得クエリ（ベースクエリ）
-- 動的WHEREフィルタはRepository層で文字列置換して追加する
SELECT
  a.attribute_name,
  a.attribute_value,
  a.attribute_remark,
  a.department_cd,
  d.department_name,
  a.is_active,
  a.update_at
FROM attribute a
LEFT JOIN department d ON a.organization_id = d.organization_id AND a.department_cd = d.department_cd
WHERE 1=1
ORDER BY a.attribute_name ASC
