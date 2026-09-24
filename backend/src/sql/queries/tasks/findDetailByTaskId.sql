-- タスク詳細取得クエリ（project_id + method_id + task_no で検索）
--
-- Parameters:
--   $1: project_id  (VARCHAR) - タスクのプロジェクトID
--   $2: method_id   (VARCHAR) - タスクのメソッドID
--   $3: task_no     (INTEGER) - タスク連番
--   $4: organization_id (UUID) - マルチテナント分離必須
--
-- Returns:
--   タスク基本情報 + タスク実行情報 + プロジェクト名 + 担当者名 + トランジション進捗集計
--   タスクが存在しない場合は0件
--   transition_data は LEFT JOIN のため、0件でも基本情報は返る

SELECT
  -- プロジェクト情報
  p.project_id,
  p.project_name,

  -- タスク基本情報 (project_task)
  pt.method_id,
  pt.experiment_order,

  -- タスク実行情報 (project_task_detail)
  ptd.task_no,
  ptd.task_status,
  ptd.experiment_user_id,
  ou.user_name                    AS experiment_user_name,
  ptd.experiment_start_at,
  ptd.experiment_end_at,
  ptd.reviewed_at,
  ptd.review_user_id,
  ptd.create_at,
  ptd.update_at,

  -- トランジション進捗集計 (transition_data)
  COUNT(td.transition_id)                                 AS total_transitions,
  COUNT(CASE WHEN td.status = 5 THEN 1 END)              AS completed_transitions,
  COUNT(CASE WHEN td.status BETWEEN 1 AND 4 THEN 1 END)  AS inprogress_transitions,
  COUNT(CASE WHEN td.status = 0 OR td.status IS NULL
             THEN 1 END)                                  AS notstarted_transitions,

FROM project p
-- タスク基本情報 (INNER JOIN: プロジェクトが存在し、かつ method_id が一致するもの)
INNER JOIN project_task pt
  ON  pt.project_id      = p.project_id
  AND pt.organization_id = p.organization_id
-- タスク実行情報 (INNER JOIN: task_no が一致するもの)
INNER JOIN project_task_detail ptd
  ON  ptd.project_id       = pt.project_id
  AND ptd.method_id        = pt.method_id
  AND ptd.experiment_order = pt.experiment_order
  AND ptd.organization_id  = pt.organization_id
-- 担当者名 (LEFT JOIN: 担当者未割り当てのタスクも含める)
LEFT JOIN organization_user ou
  ON  ou.user_id         = ptd.experiment_user_id
  AND ou.organization_id = ptd.organization_id
-- トランジション進捗 (LEFT JOIN: progress未記録のタスクも含める)
LEFT JOIN transition_data td
  ON  td.project_id       = ptd.project_id
  AND td.method_id        = ptd.method_id
  AND td.experiment_order = ptd.experiment_order
  AND td.task_no          = ptd.task_no
  AND td.organization_id  = ptd.organization_id

WHERE p.project_id      = $1
  AND pt.method_id      = $2
  AND ptd.task_no       = $3
  AND p.organization_id = $4   -- マルチテナント分離（必須）

GROUP BY
  p.project_id,
  p.project_name,
  pt.method_id,
  pt.experiment_order,
  ptd.task_no,
  ptd.task_status,
  ptd.experiment_user_id,
  ou.user_name,
  ptd.experiment_start_at,
  ptd.experiment_end_at,
  ptd.reviewed_at,
  ptd.review_user_id,
  ptd.create_at,
  ptd.update_at

LIMIT 1;
