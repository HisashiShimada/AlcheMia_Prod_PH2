-- 実験作業者がアクセス可能なプロジェクト一覧を取得
-- 
-- パラメータ:
--   $1: organization_id (string) - 組織ID（マルチテナント分離）
--   $2: organization_id (string) - project_task_detail側のorganization_id（マルチテナント分離）
-- 
-- 動的フィルタ（文字列置換で設定）:
--   STATUS_FILTER - ステータスフィルタ条件
--   GROUP_FILTER  - グループフィルタ条件（organization_group_cd による絞り込み）
--   SORT_COLUMN - ソート列
--   SORT_ORDER - ソート順序（ASC/DESC）
--   LIMIT - ページあたりの件数
--   OFFSET - オフセット
-- 
-- 使用箇所: WorkerProjectRepository.findWorkerAccessible()
-- 作成日: 2026-02-18
-- 更新日: 2026-02-20 - experiment_user_idフィルタを削除（組織内全プロジェクト表示）
-- 更新日: 2026-03-02 - organization.use_deemed_progress を追加
-- 更新日: 2026-08-31 - GROUP_FILTER を追加（ログインユーザーの所属グループで絞り込み）

SELECT DISTINCT
  project.project_id,
  project.project_name,
  project.description,
  project.project_status,
  project.create_at,
  project.update_at,
  organization.use_deemed_progress
FROM project
INNER JOIN project_task 
  ON project.project_id = project_task.project_id
INNER JOIN organization
  ON project.organization_id = organization.organization_id
WHERE 
  project.organization_id = $1
  AND project_task.organization_id = $2
  {STATUS_FILTER}
  {GROUP_FILTER}
ORDER BY {SORT_COLUMN} {SORT_ORDER}
LIMIT {LIMIT} OFFSET {OFFSET}
