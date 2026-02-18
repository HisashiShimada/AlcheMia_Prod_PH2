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
  pi.id,
  pi.project_id,
  p.project_name,
  pi.method_id,
  pi.transition_id,
  pi.task_no,
  pi.instruction_target,
  pi.instructions,
  pi.priority,
  pi.type,
  pi.create_at,
  pi.created_by,
  ua.user_name as created_by_name,
  CASE 
    WHEN iah.history_id IS NOT NULL THEN true 
    ELSE false 
  END as is_acknowledged
FROM project_instruction pi
INNER JOIN project p ON p.id = pi.project_id
LEFT JOIN user_authentication ua ON ua.user_id = pi.created_by
LEFT JOIN instruction_acknowledged_history iah 
  ON iah.instruction_id = pi.id
  AND iah.organization_id = pi.organization_id
  AND iah.acknowledged_user_id = $1
