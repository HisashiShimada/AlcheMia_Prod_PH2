-- 実験作業者がアクセス可能なプロジェクトの総件数を取得
-- 
-- パラメータ:
--   $1: organization_id (string) - 組織ID（マルチテナント分離）
--   $2: organization_id (string) - project_task_detail側のorganization_id（マルチテナント分離）
-- 
-- 動的フィルタ（文字列置換で設定）:
--   STATUS_FILTER - ステータスフィルタ条件
-- 
-- 使用箇所: WorkerProjectRepository.countWorkerAccessible()
-- 作成日: 2026-02-18
-- 更新日: 2026-02-20 - experiment_user_idフィルタを削除（組織内全プロジェクト表示）

SELECT COUNT(DISTINCT project.project_id) as count 
FROM project
INNER JOIN project_task 
  ON project.project_id = project_task.project_id
WHERE 
  project.organization_id = $1
  AND project_task.organization_id = $2
  {STATUS_FILTER}
