-- 初期画面機能CD取得クエリ（authController用）
-- 指定の組織IDとロールCDに対応する初期画面機能CDを取得
SELECT initial_screen_function_cd
FROM role
WHERE organization_id = $1
  AND role_cd = $2
