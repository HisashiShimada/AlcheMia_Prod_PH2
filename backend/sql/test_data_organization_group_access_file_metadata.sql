-- ============================================================
-- organization_group アクセス制御 動作確認用
-- file_metadata テーブル + project.project_uuid 更新
--
-- 前提:
--   - test_data_organization_group_access.sql 投入済み
--   - Swiftに以下のMAIMLファイルをアップロード済み:
--       {org_id}/projects/P_STATUS_PLANNING_WITH_MAIML/P_STATUS_PLANNING_WITH_MAIML.maiml
--       {org_id}/projects/P_STATUS_IN_PROGRESS_CO/P_STATUS_IN_PROGRESS_CO.maiml
--       {org_id}/projects/P_STATUS_REVIEW_WAITING/P_STATUS_REVIEW_WAITING.maiml
--       {org_id}/projects/P_STATUS_COMPLETED/P_STATUS_COMPLETED.maiml
--
-- ファイルサーバ: Swift (mmdpf-files コンテナ)
-- 組織ID: a0718dc5-21f3-44e6-87e9-cc2ae83f3385
--
-- 各MAIMLのdocument.uuid（=project_uuid）:
--   P_STATUS_PLANNING_WITH_MAIML  → b1000002-0000-4000-8000-000000000002
--   P_STATUS_IN_PROGRESS_CO       → b1000003-0000-4000-8000-000000000003
--   P_STATUS_REVIEW_WAITING       → b1000004-0000-4000-8000-000000000004
--   P_STATUS_COMPLETED            → b1000005-0000-4000-8000-000000000005
-- ============================================================

-- ============================================================
-- Step 1. file_metadata テーブルへのレコード登録
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
) VALUES

-- B-2: 計画中 / MAIMLあり / チェックイン
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_PLANNING_WITH_MAIML/P_STATUS_PLANNING_WITH_MAIML.maiml',
    'mmdpf-files',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'P_STATUS_PLANNING_WITH_MAIML.maiml',
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
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_PLANNING_WITH_MAIML',
    'web_upload',
    'single',
    'b1000002-0000-4000-8000-000000000002'::uuid
),

-- B-3: タスク実行中 / MAIMLあり / チェックアウト中
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_IN_PROGRESS_CO/P_STATUS_IN_PROGRESS_CO.maiml',
    'mmdpf-files',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'P_STATUS_IN_PROGRESS_CO.maiml',
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
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_IN_PROGRESS_CO',
    'web_upload',
    'single',
    'b1000003-0000-4000-8000-000000000003'::uuid
),

-- B-4: タスクレビュー待ち / MAIMLあり / チェックイン
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_REVIEW_WAITING/P_STATUS_REVIEW_WAITING.maiml',
    'mmdpf-files',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'P_STATUS_REVIEW_WAITING.maiml',
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
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_REVIEW_WAITING',
    'web_upload',
    'single',
    'b1000004-0000-4000-8000-000000000004'::uuid
),

-- B-5: 完了 / MAIMLあり / チェックイン
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_COMPLETED/P_STATUS_COMPLETED.maiml',
    'mmdpf-files',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'P_STATUS_COMPLETED.maiml',
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
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_COMPLETED',
    'web_upload',
    'single',
    'b1000005-0000-4000-8000-000000000005'::uuid
)
ON CONFLICT (file_key) DO NOTHING;

-- ============================================================
-- Step 2. project テーブルの project_uuid を更新
--
-- MAIMLの<document><uuid> と project.project_uuid を一致させる。
-- これにより file_metadata.project_uuid との JOIN が機能する。
-- ============================================================

UPDATE project
SET project_uuid = 'b1000002-0000-4000-8000-000000000002'::uuid,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND project_name = 'P_STATUS_PLANNING_WITH_MAIML';

UPDATE project
SET project_uuid = 'b1000003-0000-4000-8000-000000000003'::uuid,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND project_name = 'P_STATUS_IN_PROGRESS_CO';

UPDATE project
SET project_uuid = 'b1000004-0000-4000-8000-000000000004'::uuid,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND project_name = 'P_STATUS_REVIEW_WAITING';

UPDATE project
SET project_uuid = 'b1000005-0000-4000-8000-000000000005'::uuid,
    update_at = CURRENT_TIMESTAMP
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND project_name = 'P_STATUS_COMPLETED';

-- ============================================================
-- ✅ 確認クエリ
-- ============================================================

-- 確認1: file_metadata と project の JOIN 確認
SELECT
    p.project_name,
    p.project_uuid,
    p.project_maiml_flg,
    fm.file_key,
    fm.maiml_analysis_status,
    fm.maiml_transitions_count,
    fm.maiml_places_count
FROM project p
LEFT JOIN file_metadata fm ON fm.project_uuid = p.project_uuid
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND p.project_name IN (
    'P_STATUS_PLANNING_WITH_MAIML',
    'P_STATUS_IN_PROGRESS_CO',
    'P_STATUS_REVIEW_WAITING',
    'P_STATUS_COMPLETED'
  )
ORDER BY p.project_name;

-- ============================================================
-- ✅ データクリーンアップ（削除時に使用）
-- ============================================================
/*
DELETE FROM file_metadata
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND file_key LIKE 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385/projects/P_STATUS_%';

UPDATE project
SET project_uuid = NULL, update_at = CURRENT_TIMESTAMP
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND project_name IN (
    'P_STATUS_PLANNING_WITH_MAIML',
    'P_STATUS_IN_PROGRESS_CO',
    'P_STATUS_REVIEW_WAITING',
    'P_STATUS_COMPLETED'
  );
*/
