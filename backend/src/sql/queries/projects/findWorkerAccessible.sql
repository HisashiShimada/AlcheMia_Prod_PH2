-- 実験作業者がアクセス可能なプロジェクト一覧を取得
-- 
-- パラメータ:
--   $1: organization_id (string) - 組織ID（マルチテナント分離）
--   $2: user_id (string) - ユーザーID
--   $3: organization_id (string) - project_task_detail側のorganization_id（マルチテナント分離）
-- 
-- 動的フィルタ（文字列置換で設定）:
--   STATUS_FILTER - ステータスフィルタ条件
--   SORT_COLUMN - ソート列
--   SORT_ORDER - ソート順序（ASC/DESC）
--   LIMIT - ページあたりの件数
--   OFFSET - オフセット
-- 
-- 使用箇所: WorkerProjectRepository.findWorkerAccessible()
-- 作成日: 2026-02-18

SELECT DISTINCT
  project.project_id,
  project.project_name,
  project.description,
  project.project_status,
  project.create_at,
  project.update_at
FROM project
INNER JOIN project_task_detail 
  ON project.project_id = project_task_detail.project_id
WHERE 
  project.organization_id = $1
  AND project_task_detail.experiment_user_id = $2
  AND project_task_detail.organization_id = $3
  {STATUS_FILTER}
ORDER BY {SORT_COLUMN} {SORT_ORDER}
LIMIT {LIMIT} OFFSET {OFFSET}
