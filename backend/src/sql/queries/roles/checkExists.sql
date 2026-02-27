-- ロール存在確認クエリ
-- 指定の組織IDとロールCDのレコードが存在するか確認
SELECT role_cd
FROM role
WHERE organization_id = $1
  AND role_cd = $2
