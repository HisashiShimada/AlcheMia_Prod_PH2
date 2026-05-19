-- プロジェクト関連データ削除: project_task_detail
-- $1: organization_id, $2: project_id
DELETE FROM project_task_detail
WHERE organization_id = $1
  AND project_id = $2
