-- メソッド別タスク一覧＋進捗集計クエリ
-- 使用箇所:
--   - projectController.ts - getMethodTasks()
-- パラメータ: $1=projectId, $2=methodId, $3=organizationId
--
-- 概要:
--   指定プロジェクト・メソッドに紐づく全タスクを進捗集計付きで取得する。
--   project_task（メソッド定義）× project_task_detail（タスク実行単位）×
--   transition_data（トランジション進捗）× organization_user（担当者名）をJOINする。
--   experiment_order + task_no 単位でGROUP BYし、トランジション進捗を集計する。

SELECT
  pt.experiment_order,
  pt.task_name,
  ptd.task_no,
  ptd.task_status,
  ptd.experiment_user_id,
  ou.user_name                                              AS experiment_user_name,
  ptd.experiment_start_at,
  ptd.experiment_end_at,
  ptd.create_at,
  ptd.update_at,
  -- トランジション進捗集計（transition_dataが0件の場合はすべて0）
  COUNT(td.transition_id)                                   AS total_transitions,
  COUNT(CASE WHEN td.status = 5 THEN 1 END)                AS completed_transitions,
  COUNT(CASE WHEN td.status BETWEEN 1 AND 4 THEN 1 END)    AS inprogress_transitions,
  COUNT(CASE WHEN td.status = 0 OR td.status IS NULL
             THEN 1 END)                                    AS notstarted_transitions,
  COALESCE(ROUND(AVG(td.progress_rate), 1), 0)             AS avg_progress_rate
FROM project_task pt
-- タスク実行単位（LEFT JOIN: task_detail未登録のメソッドも含める）
LEFT JOIN project_task_detail ptd
  ON  ptd.project_id      = pt.project_id
  AND ptd.method_id       = pt.method_id
  AND ptd.experiment_order = pt.experiment_order
  AND ptd.organization_id = pt.organization_id
-- トランジション進捗（LEFT JOIN: progress未記録のタスクも含める）
LEFT JOIN transition_data td
  ON  td.project_id       = ptd.project_id
  AND td.method_id        = ptd.method_id
  AND td.experiment_order = ptd.experiment_order
  AND td.task_no          = ptd.task_no
  AND td.organization_id  = ptd.organization_id
-- 担当者名（LEFT JOIN: 担当者未割り当てのタスクも含める）
LEFT JOIN organization_user ou
  ON  ou.user_id          = ptd.experiment_user_id
  AND ou.organization_id  = ptd.organization_id
WHERE pt.project_id      = $1
  AND pt.method_id        = $2
  AND pt.organization_id  = $3   -- マルチテナント分離（必須）
GROUP BY
  pt.experiment_order,
  pt.task_name,
  ptd.task_no,
  ptd.task_status,
  ptd.experiment_user_id,
  ou.user_name,
  ptd.experiment_start_at,
  ptd.experiment_end_at,
  ptd.create_at,
  ptd.update_at
ORDER BY
  pt.experiment_order ASC,
  ptd.task_no         ASC
