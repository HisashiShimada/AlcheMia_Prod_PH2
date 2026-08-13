-- 組織の名前空間宣言（uri）を1件取得
-- XML ビューの xmlns 注入用
SELECT uri
FROM namespace
WHERE organization_id = $1
LIMIT 1
