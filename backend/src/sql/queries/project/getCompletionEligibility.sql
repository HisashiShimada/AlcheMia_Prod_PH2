-- プロジェクト完了ボタン活性条件チェック
-- 以下の4条件をすべて確認して返す:
--   ① project_status = 3 (REVIEW_WAITING)
--   ② 全タスクが COMPLETED(3) or REVIEW_NG(5)、かつ1件以上存在
--   ③ 全トランジションが終状態(6:COMPLETED)、かつ1件以上存在
--   ④ project_overall_evaluations に evaluation_scope='MAIML_PROJECT' のレコードが存在
--
-- $1: organization_id (UUID)
-- $2: project_id (VARCHAR)
SELECT
  -- ① プロジェクトステータス = 3 (REVIEW_WAITING)
  (p.project_status = 3)                                                        AS is_review_waiting,

  -- ② 全タスクが COMPLETED(3) or REVIEW_NG(5)、かつ1件以上存在
  (
    COUNT(ptd.task_no) > 0
    AND COUNT(*) FILTER (WHERE ptd.task_status NOT IN (3, 5)) = 0
  )                                                                              AS all_tasks_done,

  -- ③ 全トランジションが終状態(6:COMPLETED)、かつ1件以上存在
  (
    COUNT(td.transition_id) > 0
    AND COUNT(*) FILTER (WHERE td.status <> 6) = 0
  )                                                                              AS all_transitions_completed,

  -- ④ evaluation_scope='MAIML_PROJECT' のレコードが存在
  (
    EXISTS (
      SELECT 1
        FROM project_overall_evaluations poe
       WHERE poe.organization_id = $1
         AND poe.project_id      = $2
         AND poe.evaluation_scope = 'MAIML_PROJECT'
    )
  )                                                                              AS has_project_evaluation

FROM project p
LEFT JOIN project_task_detail ptd
       ON ptd.organization_id = p.organization_id
      AND ptd.project_id      = p.project_id
LEFT JOIN transition_data td
       ON td.organization_id  = p.organization_id
      AND td.project_id       = p.project_id
WHERE p.organization_id = $1
  AND p.project_id      = $2
GROUP BY p.project_status
