-- プロジェクト関連データ削除: issue_comment
-- $1: organization_id, $2: project_id
DELETE FROM issue_comment
WHERE organization_id = $1
  AND project_id = $2
