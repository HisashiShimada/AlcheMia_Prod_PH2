-- プロジェクト名からプロジェクトIDとステータスを取得
-- 
-- Parameters:
--   $1: organization_id (UUID) - 組織ID（マルチテナント分離）
--   $2: project_name (TEXT) - プロジェクト名
-- 
-- Returns:
--   project_id, project_status（見つからない場合は0件）

SELECT 
  project_id, 
  project_status 
FROM project 
WHERE organization_id = $1 
  AND project_name = $2;
