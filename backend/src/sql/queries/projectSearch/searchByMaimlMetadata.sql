-- MAIML検索メタデータを使ったプロジェクト検索クエリ（ベース）
-- 
-- @description
-- file_metadataテーブルのmaiml_*カラムを使って検索し、
-- projectテーブルとJOINしてプロジェクト情報を返す
-- 
-- @remarks
-- 動的なWHERE条件はRepository層で付加する。
-- このファイルはSELECT/FROM/JOINまでの固定部分を定義する。
-- 
-- @parameters
-- $1: organization_id（マルチテナント分離に必須）

SELECT DISTINCT
  p.project_id,
  p.project_name,
  p.description,
  p.project_status,
  p.create_at,
  p.update_at,
  fm.file_key,
  fm.maiml_document_name,
  fm.maiml_document_uuid,
  fm.maiml_document_description,
  fm.maiml_metadata_extraction_status
FROM file_metadata fm
INNER JOIN project p
  ON p.organization_id = fm.organization_id
  AND fm.file_key LIKE CONCAT(fm.organization_id, '/projects/', p.project_name, '/%')
WHERE fm.organization_id = $1
  AND fm.maiml_metadata_extraction_status = 'completed'
