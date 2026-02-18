-- 実験作業者がアクセス可能なプロジェクトの総件数を取得
-- 
-- パラメータ:
--   $1: organization_id (string) - 組織ID（マルチテナント分離）
--   $2: user_id (string) - ユーザーID
--   $3: organization_id (string) - project_task_detail側のorganization_id（マルチテナント分離）
-- 
-- 動的フィルタ（文字列置換で設定）:
--   {STATUS_FILTER} - ステータスフィルタ条件
-- 
-- 使用箇所: WorkerProjectRepository.countWorkerAccessible()
-- 作成日: 2026-02-18

SELECT COUNT(DISTINCT project.project_id) as count 
FROM project
INNER JOIN project_task_detail 
  ON project.project_id = project_task_detail.project_id
WHERE 
  project.organization_id = $1
  AND project_task_detail.experiment_user_id = $2
  AND project_task_detail.organization_id = $3
  {STATUS_FILTER}
