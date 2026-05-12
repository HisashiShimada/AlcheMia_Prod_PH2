-- プロジェクトステータスを更新
-- $1: project_status（新しいステータス値）
-- $2: update_user_id（更新ユーザーID）
-- $3: organization_id
-- $4: project_id
UPDATE project
SET 
  project_status = $1,
  update_at = CURRENT_TIMESTAMP,
  update_user_id = $2
WHERE organization_id = $3
  AND project_id = $4
