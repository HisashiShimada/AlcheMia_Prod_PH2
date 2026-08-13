-- project テーブルから organization_group_cd を取得するクエリ
-- $1: project_id
-- $2: organization_id
SELECT organization_group_cd
FROM project
WHERE project_id = $1
  AND organization_id = $2
