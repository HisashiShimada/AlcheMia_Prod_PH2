-- プロジェクト情報取得（MAIML取得用）
-- 用途: プロジェクトの存在確認とproject_name取得（S3パス構築に使用）
-- パラメータ: 
--   $1 = organization_id (マルチテナント分離)
--   $2 = project_id
SELECT 
  project_id,
  project_name
FROM project
WHERE organization_id = $1
  AND project_id = $2
