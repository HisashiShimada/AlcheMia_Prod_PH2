-- ============================================================
-- organization_group プロジェクト動作確認用 タスクデータ
--
-- ■ 役割: project_task / project_task_detail の登録のみ
--   file_metadata / project_uuid の登録・更新は
--   test_data_organization_group_access_file_metadata.sql が担当
--
-- ■ 対象プロジェクト（全て organization_id: a0718dc5-21f3-44e6-87e9-cc2ae83f3385）:
--   B-2: P_STATUS_PLANNING_WITH_MAIML  → status=0(PLANNING) / MAIML登録済み
--   B-3: P_STATUS_IN_PROGRESS_CO       → status=2(IN_PROGRESS) / チェックアウト中
--   B-4: P_STATUS_REVIEW_WAITING       → status=3(REVIEW_WAITING)
--   B-5: P_STATUS_COMPLETED            → status=4(COMPLETED)
--
-- ■ 実行順序:
--   1. test_data_insert.sql
--   2. test_data_organization_group_access.sql
--   3. test_data_organization_group_access_file_metadata.sql  ← file_metadata / project_uuid
--   4. このファイル（tasks.sql）                              ← project_task / project_task_detail
--
-- ■ MAIMLファイル:
--   - Method ID: method_test_ito_d4076d3d
--   - Transitions: transition1(order=1), transition2(order=2), transition3(order=3)
--
-- ============================================================
-- 冪等実行: ON CONFLICT DO NOTHING を使用
-- ============================================================

-- ============================================================
-- 定数定義（変数として参照）
-- ============================================================
-- organization_id : a0718dc5-21f3-44e6-87e9-cc2ae83f3385
-- method_id       : method_test_ito_d4076d3d
-- document_uuid   : ddbbe4b2-be96-40d2-a77f-d610a59e2ab3
--
-- タスク構成（transition → experiment_order）:
--   transition1 → order=1
--   transition2 → order=2
--   transition3 → order=3
--
-- task_status 値:
--   0: PENDING（実行待ち）
--   1: IN_PROGRESS（実行中）
--   2: REVIEW_WAITING（レビュー待ち）
--   3: COMPLETED（完了）
--   4: FORCED_TERMINATED（異常終了）
-- ============================================================

-- ============================================================
-- Step 1. project_task テーブルへのタスク登録
--
-- test_ito.maiml の Transition 構成:
--   transition1（order=1）: material1 + condition1 → result1
--   transition2（order=2）: material2 + condition2 → result2
--   transition3（order=3）: result1 + result2 → result3
--
-- project_id は project テーブルから project_name で取得
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- B-2: P_STATUS_PLANNING_WITH_MAIML
--      タスク登録のみ（タスク詳細は未作成 = 作業割り当て前の状態）
-- ────────────────────────────────────────────────────────────
INSERT INTO project_task (
    organization_id,
    project_id,
    method_id,
    experiment_order,
    experiment_condition,
    attempts_count,
    worker_linked_flg,
    create_user_id,
    create_at,
    update_user_id,
    update_at
)
SELECT
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    p.project_id,
    'method_test_ito_d4076d3d',
    vals.experiment_order,
    1,    -- SAME_CONDITIONS
    1,    -- 試行回数=1
    false,
    'dev_user@example.com',
    CURRENT_TIMESTAMP,
    'dev_user@example.com',
    CURRENT_TIMESTAMP
FROM project p
CROSS JOIN (VALUES
    (1),
    (2),
    (3)
) AS vals(experiment_order)
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name = 'P_STATUS_PLANNING_WITH_MAIML'
ON CONFLICT (organization_id, project_id, method_id, experiment_order) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- B-3: P_STATUS_IN_PROGRESS_CO（チェックアウト中・タスク作業進行中）
--      transition1: 完了済み
--      transition2: 実行中（IN_PROGRESS）
--      transition3: 実行待ち（PENDING）
-- ────────────────────────────────────────────────────────────
INSERT INTO project_task (
    organization_id, project_id, method_id,
    experiment_order, experiment_condition, attempts_count, worker_linked_flg,
    create_user_id, create_at, update_user_id, update_at
)
SELECT
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    p.project_id,
    'method_test_ito_d4076d3d',
    vals.experiment_order,
    1, 1, true,
    'dev_user@example.com', CURRENT_TIMESTAMP, 'dev_user@example.com', CURRENT_TIMESTAMP
FROM project p
CROSS JOIN (VALUES (1), (2), (3)) AS vals(experiment_order)
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name = 'P_STATUS_IN_PROGRESS_CO'
ON CONFLICT (organization_id, project_id, method_id, experiment_order) DO NOTHING;

-- project_task_detail: B-3
-- transition1（task_no=1）: 完了
INSERT INTO project_task_detail (
    organization_id, project_id, method_id, task_no,
    task_status, experiment_start_at, experiment_end_at,
    experiment_user_id, reviewed_at, review_user_id,
    create_user_id, create_at, update_user_id, update_at
)
SELECT
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    p.project_id,
    'method_test_ito_d4076d3d',
    1,
    3,   -- COMPLETED
    '2026-07-01 09:00:00',
    '2026-07-01 12:00:00',
    'no_group_user@example.com',  -- experiment_worker 相当
    '2026-07-01 13:00:00',
    'dev_user@example.com',       -- experiment_admin 相当（レビュアー）
    'dev_user@example.com', CURRENT_TIMESTAMP, 'dev_user@example.com', CURRENT_TIMESTAMP
FROM project p
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name = 'P_STATUS_IN_PROGRESS_CO'
ON CONFLICT (organization_id, project_id, method_id, task_no) DO NOTHING;

-- transition2（task_no=2）: 実行中
INSERT INTO project_task_detail (
    organization_id, project_id, method_id, task_no,
    task_status, experiment_start_at, experiment_end_at,
    experiment_user_id, reviewed_at, review_user_id,
    create_user_id, create_at, update_user_id, update_at
)
SELECT
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    p.project_id,
    'method_test_ito_d4076d3d',
    2,
    1,   -- IN_PROGRESS
    '2026-07-02 09:00:00',
    NULL,
    'no_group_user@example.com',
    NULL, NULL,
    'dev_user@example.com', CURRENT_TIMESTAMP, 'dev_user@example.com', CURRENT_TIMESTAMP
FROM project p
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name = 'P_STATUS_IN_PROGRESS_CO'
ON CONFLICT (organization_id, project_id, method_id, task_no) DO NOTHING;

-- transition3（task_no=3）: 実行待ち
INSERT INTO project_task_detail (
    organization_id, project_id, method_id, task_no,
    task_status, experiment_start_at, experiment_end_at,
    experiment_user_id, reviewed_at, review_user_id,
    create_user_id, create_at, update_user_id, update_at
)
SELECT
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    p.project_id,
    'method_test_ito_d4076d3d',
    3,
    0,   -- PENDING
    NULL, NULL,
    'no_group_user@example.com',
    NULL, NULL,
    'dev_user@example.com', CURRENT_TIMESTAMP, 'dev_user@example.com', CURRENT_TIMESTAMP
FROM project p
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name = 'P_STATUS_IN_PROGRESS_CO'
ON CONFLICT (organization_id, project_id, method_id, task_no) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- B-4: P_STATUS_REVIEW_WAITING（全タスク作業完了・レビュー待ち）
--      全 transition: 完了（task_status=3）、reviewed_at=NULL
-- ────────────────────────────────────────────────────────────
INSERT INTO project_task (
    organization_id, project_id, method_id,
    experiment_order, experiment_condition, attempts_count, worker_linked_flg,
    create_user_id, create_at, update_user_id, update_at
)
SELECT
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    p.project_id,
    'method_test_ito_d4076d3d',
    vals.experiment_order,
    1, 1, true,
    'dev_user@example.com', CURRENT_TIMESTAMP, 'dev_user@example.com', CURRENT_TIMESTAMP
FROM project p
CROSS JOIN (VALUES (1), (2), (3)) AS vals(experiment_order)
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name = 'P_STATUS_REVIEW_WAITING'
ON CONFLICT (organization_id, project_id, method_id, experiment_order) DO NOTHING;

-- project_task_detail: B-4（全タスク REVIEW_WAITING = 2）
INSERT INTO project_task_detail (
    organization_id, project_id, method_id, task_no,
    task_status, experiment_start_at, experiment_end_at,
    experiment_user_id, reviewed_at, review_user_id,
    create_user_id, create_at, update_user_id, update_at
)
SELECT
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    p.project_id,
    'method_test_ito_d4076d3d',
    vals.task_no,
    2,   -- REVIEW_WAITING（承認依頼済み）
    vals.start_at,
    vals.end_at,
    'no_group_user@example.com',
    NULL,  -- レビュー未完了
    NULL,
    'dev_user@example.com', CURRENT_TIMESTAMP, 'dev_user@example.com', CURRENT_TIMESTAMP
FROM project p
CROSS JOIN (VALUES
    (1, '2026-07-10 09:00:00'::timestamp, '2026-07-10 12:00:00'::timestamp),
    (2, '2026-07-11 09:00:00'::timestamp, '2026-07-11 14:00:00'::timestamp),
    (3, '2026-07-12 09:00:00'::timestamp, '2026-07-12 11:00:00'::timestamp)
) AS vals(task_no, start_at, end_at)
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name = 'P_STATUS_REVIEW_WAITING'
ON CONFLICT (organization_id, project_id, method_id, task_no) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- B-5: P_STATUS_COMPLETED（全タスク完了・レビュー済み）
-- ────────────────────────────────────────────────────────────
INSERT INTO project_task (
    organization_id, project_id, method_id,
    experiment_order, experiment_condition, attempts_count, worker_linked_flg,
    create_user_id, create_at, update_user_id, update_at
)
SELECT
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    p.project_id,
    'method_test_ito_d4076d3d',
    vals.experiment_order,
    1, 1, true,
    'dev_user@example.com', CURRENT_TIMESTAMP, 'dev_user@example.com', CURRENT_TIMESTAMP
FROM project p
CROSS JOIN (VALUES (1), (2), (3)) AS vals(experiment_order)
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name = 'P_STATUS_COMPLETED'
ON CONFLICT (organization_id, project_id, method_id, experiment_order) DO NOTHING;

-- project_task_detail: B-5（全タスク COMPLETED = 3）
INSERT INTO project_task_detail (
    organization_id, project_id, method_id, task_no,
    task_status, experiment_start_at, experiment_end_at,
    experiment_user_id, reviewed_at, review_user_id,
    create_user_id, create_at, update_user_id, update_at
)
SELECT
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    p.project_id,
    'method_test_ito_d4076d3d',
    vals.task_no,
    3,   -- COMPLETED
    vals.start_at,
    vals.end_at,
    'no_group_user@example.com',
    vals.reviewed_at,
    'dev_user@example.com',  -- experiment_admin 相当（レビュアー）
    'dev_user@example.com', CURRENT_TIMESTAMP, 'dev_user@example.com', CURRENT_TIMESTAMP
FROM project p
CROSS JOIN (VALUES
    (1, '2026-07-20 09:00:00'::timestamp, '2026-07-20 12:00:00'::timestamp, '2026-07-20 14:00:00'::timestamp),
    (2, '2026-07-21 09:00:00'::timestamp, '2026-07-21 15:00:00'::timestamp, '2026-07-21 16:00:00'::timestamp),
    (3, '2026-07-22 09:00:00'::timestamp, '2026-07-22 11:00:00'::timestamp, '2026-07-22 13:00:00'::timestamp)
) AS vals(task_no, start_at, end_at, reviewed_at)
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name = 'P_STATUS_COMPLETED'
ON CONFLICT (organization_id, project_id, method_id, task_no) DO NOTHING;

-- ============================================================
-- ✅ 確認クエリ
-- ============================================================

-- project + task + task_detail の結合確認
SELECT
    p.project_name,
    p.project_status,
    CASE p.project_status
        WHEN 0 THEN 'PLANNING'
        WHEN 1 THEN 'TASK_PENDING'
        WHEN 2 THEN 'TASK_IN_PROGRESS'
        WHEN 3 THEN 'REVIEW_WAITING'
        WHEN 4 THEN 'COMPLETED'
    END AS status_name,
    p.project_maiml_flg,
    p.checkout_status,
    pt.method_id,
    pt.experiment_order,
    ptd.task_no,
    ptd.task_status,
    CASE ptd.task_status
        WHEN 0 THEN 'PENDING'
        WHEN 1 THEN 'IN_PROGRESS'
        WHEN 2 THEN 'REVIEW_WAITING'
        WHEN 3 THEN 'COMPLETED'
        WHEN 4 THEN 'ERROR'
    END AS task_status_name,
    ptd.experiment_user_id,
    ptd.reviewed_at
FROM project p
LEFT JOIN project_task pt
    ON pt.organization_id = p.organization_id
    AND pt.project_id = p.project_id
LEFT JOIN project_task_detail ptd
    ON ptd.organization_id = pt.organization_id
    AND ptd.project_id = pt.project_id
    AND ptd.method_id = pt.method_id
    AND ptd.task_no = pt.experiment_order
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name IN (
    'P_STATUS_PLANNING_WITH_MAIML',
    'P_STATUS_IN_PROGRESS_CO',
    'P_STATUS_REVIEW_WAITING',
    'P_STATUS_COMPLETED'
  )
ORDER BY p.project_name, pt.experiment_order, ptd.task_no;

-- file_metadata 確認
SELECT
    file_key,
    original_filename,
    is_maiml_file,
    maiml_transitions_count,
    project_uuid
FROM file_metadata
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND file_key LIKE 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_%'
ORDER BY file_key;

-- ============================================================
-- ✅ タスクデータ投入後のステータス整合性チェック
-- ============================================================
-- プロジェクトステータスとタスク状態の整合:
--
-- B-2 PLANNING_WITH_MAIML:
--   project_task: 3件（task_detail未登録 = タスク割り当て前）
--
-- B-3 IN_PROGRESS_CO:
--   task_no=1: COMPLETED → transition1 完了
--   task_no=2: IN_PROGRESS → transition2 実行中
--   task_no=3: PENDING → transition3 待機中
--
-- B-4 REVIEW_WAITING:
--   task_no=1,2,3: REVIEW_WAITING → 全タスク承認依頼済み、レビュー未完了
--
-- B-5 COMPLETED:
--   task_no=1,2,3: COMPLETED → 全タスク完了・レビュー済み
-- ============================================================

-- ============================================================
-- ✅ クリーンアップ（削除時に使用）
-- ============================================================
/*
-- project_task_detail 削除
DELETE FROM project_task_detail
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND project_id IN (
    SELECT project_id FROM project
    WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
      AND project_name IN (
        'P_STATUS_PLANNING_WITH_MAIML', 'P_STATUS_IN_PROGRESS_CO',
        'P_STATUS_REVIEW_WAITING', 'P_STATUS_COMPLETED'
      )
  );

-- project_task 削除
DELETE FROM project_task
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND project_id IN (
    SELECT project_id FROM project
    WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
      AND project_name IN (
        'P_STATUS_PLANNING_WITH_MAIML', 'P_STATUS_IN_PROGRESS_CO',
        'P_STATUS_REVIEW_WAITING', 'P_STATUS_COMPLETED'
      )
  );

-- file_metadata 削除
DELETE FROM file_metadata
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND file_key LIKE 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_%';
*/
