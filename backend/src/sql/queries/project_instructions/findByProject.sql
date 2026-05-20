-- プロジェクト内の指示一覧を取得（ベースクエリ）
-- オプション条件（instruction_status）は呼び出し元で動的に追加
SELECT *
FROM project_instruction
WHERE organization_id = $1
  AND project_id = $2
