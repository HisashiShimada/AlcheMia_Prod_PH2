-- プロジェクト名からプロジェクトIDとステータスを取得
-- 
-- Parameters:
--   $1: organization_id (UUID) - 組織ID（マルチテナント分離）
--   $2: project_name (TEXT) - プロジェクト名
-- 
-- Returns:
--   id, status（見つからない場合は0件）

SELECT 
  id, 
  status 
FROM projects 
WHERE organization_id = $1 
  AND project_name = $2;
