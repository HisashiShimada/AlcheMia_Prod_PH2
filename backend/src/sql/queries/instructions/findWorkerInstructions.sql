/**
 * 作業指示一覧取得（実験作業者用）
 * 
 * @description プロジェクトに関連する作業指示一覧を取得する
 * @param $1 {string} userId - 確認済みチェック用のユーザーID（LEFT JOIN用）
 * 
 * @note このクエリはベースクエリです。実際の使用時はTypeScript側で以下を動的追加します：
 *   - experiment_workerの場合: INNER JOIN project_task pt ON pt.project_id = pi.project_id
 *   - WHERE条件: organization_id, project_name, projectId等
 *   - ORDER BY: pi.create_at DESC
 */
SELECT 
  pi.experiment_instruction_id as id,
  pi.project_id,
  p.project_name,
  pi.method_id,
  pi.transition_id,
  pi.task_no,
  pi.instructions as instruction_content,
  pi.create_at,
  pi.create_user_id as created_by,
  ou.user_name as created_by_name,
  CASE 
    WHEN iah.experiment_user_id IS NOT NULL THEN true 
    ELSE false 
  END as is_acknowledged
FROM project_instruction pi
INNER JOIN project p ON p.project_id = pi.project_id AND p.organization_id = pi.organization_id
LEFT JOIN organization_user ou ON ou.user_id = pi.create_user_id AND ou.organization_id = pi.organization_id
LEFT JOIN instruction_acknowledged_history iah 
  ON iah.experiment_instruction_id = pi.experiment_instruction_id
  AND iah.organization_id = pi.organization_id
  AND iah.project_id = pi.project_id
  AND iah.experiment_user_id = $1
