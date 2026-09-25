-- プロジェクトIDからプロジェクト名・ステータスを取得
-- 
-- Parameters:
--   $1: organization_id (UUID) - 組織ID（マルチテナント分離）
--   $2: project_id (TEXT) - プロジェクトID
-- 
-- Returns:
--   project_name, project_status（見つからない場合は0件）

SELECT
  project_name,
  project_status
FROM project
WHERE organization_id = $1
  AND project_id = $2;
