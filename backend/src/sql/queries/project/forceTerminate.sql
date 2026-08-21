-- プロジェクト強制終了クエリ
-- project_status を ERROR に更新する
UPDATE project
   SET project_status = $1,
       update_at = CURRENT_TIMESTAMP
 WHERE organization_id = $2
   AND project_id = $3
RETURNING project_id
