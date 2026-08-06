-- ============================================================
-- パッチ: P_STATUS_TASK_PENDING プロジェクト追加
--
-- 既存のテストデータ（test_data_organization_group_access*.sql）が
-- 投入済みの環境に対して、追加分だけを適用するファイル。
--
-- 前提:
--   - test_data_organization_group_access.sql 投入済み
--   - test_data_organization_group_access_file_metadata.sql 投入済み
--   - test_data_organization_group_access_tasks.sql 投入済み
--
-- 組織ID: a0718dc5-21f3-44e6-87e9-cc2ae83f3385
-- ============================================================

-- ============================================================
-- Step 1. project テーブルへの追加
--
-- P_STATUS_TASK_PENDING:
--   project_status = 1 (TASK_PENDING)
--   project_maiml_flg = true (MAIMLあり)
--   checkout_status = 1 (CHECKED_OUT)
--   owner: dev_user@example.com
-- ============================================================
INSERT INTO project (
    organization_id,
    project_id,
    project_name,
    description,
    organization_group_cd,
    project_status,
    project_maiml_flg,
    checkout_status,
    owner_user_id,
    create_at,
    update_at,
    create_user_id,
    update_user_id
) VALUES (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'proj_st_task_pend',
    'P_STATUS_TASK_PENDING',
    '[状態B-2.5] タスク実行待ち / MAIMLあり / チェックアウト中（dev_userがチェックアウト）',
    'HQ-DEV',
    1,     -- TASK_PENDING
    true,  -- MAIMLあり
    1,     -- CHECKED_OUT
    'dev_user@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    'dev_user@example.com', 'dev_user@example.com'
)
ON CONFLICT (project_name) DO NOTHING;

-- ============================================================
-- Step 2. file_metadata テーブルへの追加
--
-- Swift上のパス:
--   {org_id}/projects/P_STATUS_TASK_PENDING/P_STATUS_TASK_PENDING.maiml
-- project_uuid: b1000006-0000-4000-8000-000000000006
-- ============================================================
INSERT INTO file_metadata (
    file_key,
    s3_bucket,
    organization_id,
    original_filename,
    file_size,
    file_type,
    file_extension,
    is_maiml_file,
    maiml_analysis_status,
    maiml_version,
    maiml_transitions_count,
    maiml_places_count,
    uploaded_by,
    create_user_id,
    update_user_id,
    parent_folder_path,
    upload_source,
    upload_method,
    project_uuid
) VALUES (
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_TASK_PENDING/P_STATUS_TASK_PENDING.maiml',
    'mmdpf-files',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'P_STATUS_TASK_PENDING.maiml',
    1420,
    'application/xml',
    'maiml',
    true,
    'completed',
    '1.0',
    1,
    1,
    'dev_user@example.com',
    'dev_user@example.com',
    'dev_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_TASK_PENDING',
    'web_upload',
    'single',
    'b1000006-0000-4000-8000-000000000006'::uuid
)
ON CONFLICT (file_key) DO NOTHING;

-- ============================================================
-- Step 3. project.project_uuid の設定
-- ============================================================
UPDATE project
SET project_uuid = 'b1000006-0000-4000-8000-000000000006'::uuid,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND project_name = 'P_STATUS_TASK_PENDING';

-- ============================================================
-- Step 4. project_task テーブルへの追加
--
-- タスク登録済み・task_detail未登録（チェックアウト直後・着手前）
-- method_id: method_test_ito_d4076d3d
-- transitions: order=1,2,3
-- ============================================================
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
    1, 1, false,
    'dev_user@example.com', CURRENT_TIMESTAMP, 'dev_user@example.com', CURRENT_TIMESTAMP
FROM project p
CROSS JOIN (VALUES (1), (2), (3)) AS vals(experiment_order)
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name = 'P_STATUS_TASK_PENDING'
ON CONFLICT (organization_id, project_id, method_id, experiment_order) DO NOTHING;

-- ============================================================
-- ✅ 確認クエリ
-- ============================================================
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
    p.project_maiml_flg AS maiml,
    p.checkout_status,
    CASE p.checkout_status
        WHEN 0 THEN 'CHECKED_IN'
        WHEN 1 THEN 'CHECKED_OUT'
    END AS checkout_name,
    p.project_uuid,
    fm.file_key,
    COUNT(pt.experiment_order) AS task_count
FROM project p
LEFT JOIN file_metadata fm ON fm.project_uuid = p.project_uuid
LEFT JOIN project_task pt
    ON pt.organization_id = p.organization_id
    AND pt.project_id = p.project_id
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name = 'P_STATUS_TASK_PENDING'
GROUP BY p.project_name, p.project_status, p.project_maiml_flg,
         p.checkout_status, p.project_uuid, fm.file_key;

-- ============================================================
-- ✅ クリーンアップ（削除時に使用）
-- ============================================================
/*
DELETE FROM project_task
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND project_id = (
    SELECT project_id FROM project
    WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
      AND project_name = 'P_STATUS_TASK_PENDING'
  );

DELETE FROM file_metadata
WHERE file_key = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_TASK_PENDING/P_STATUS_TASK_PENDING.maiml';

DELETE FROM project
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND project_name = 'P_STATUS_TASK_PENDING';
*/
