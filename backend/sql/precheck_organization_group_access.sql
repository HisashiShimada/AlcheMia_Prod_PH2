-- ============================================================
-- 事前チェック用SQL
-- test_data_organization_group_access.sql 投入前に実行して
-- 制約違反の有無を確認する
--
-- 対象組織ID: a0718dc5-21f3-44e6-87e9-cc2ae83f3385
-- ============================================================

-- ============================================================
-- チェック1: 組織が存在するか
-- 期待値: 1行（AIML研究所）
-- ============================================================
SELECT '=== チェック1: 組織の存在確認 ===' AS check_item;
SELECT organization_id, organization_display_name
FROM organization
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid;

-- ============================================================
-- チェック2: ロール 'experiment_admin' が存在するか
-- 期待値: 1行
-- 0行なら organization_user.role_cd の外部キー制約でエラーになる可能性あり
-- ============================================================
SELECT '=== チェック2: ロール experiment_admin の存在確認 ===' AS check_item;
SELECT organization_id, role_cd, role_name, is_active
FROM role
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND role_cd = 'experiment_admin';

-- ============================================================
-- チェック3: 投入ユーザーが既存テーブルと重複していないか
-- 期待値: 0行（重複なし）
-- 行が返ればそのユーザーはすでに存在（ON CONFLICT DO NOTHING でスキップされる）
-- ============================================================
SELECT '=== チェック3: organization_user の重複確認 ===' AS check_item;
SELECT user_id, user_name, role_cd
FROM organization_user
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND user_id IN (
    'hq_user@example.com',
    'dev_user@example.com',
    'dev_a_user@example.com',
    'sales_user@example.com',
    'multi_user@example.com',
    'no_group_user@example.com'
  );

-- ============================================================
-- チェック4: EXTERNAL グループの chief ユーザー (exp.admin@example.com) が存在するか
-- 期待値: 1行
-- 0行なら organization_group への INSERT が FK エラーになる可能性あり
-- ============================================================
SELECT '=== チェック4: exp.admin@example.com の存在確認 ===' AS check_item;
SELECT user_id, user_name, role_cd, is_active
FROM organization_user
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND user_id = 'exp.admin@example.com';

-- ============================================================
-- チェック5: project_name の重複確認
-- 期待値: 0行（重複なし）
-- project_name にはユニーク制約があるため、
-- 他組織を含めて重複がないか確認する
-- ============================================================
SELECT '=== チェック5: project_name の重複確認（全組織） ===' AS check_item;
SELECT organization_id, project_id, project_name
FROM project
WHERE project_name IN (
    'P_HQ',
    'P_HQ_DEV',
    'P_HQ_DEV_A',
    'P_HQ_SALES',
    'P_EXTERNAL',
    'P_STATUS_PLANNING_NO_MAIML',
    'P_STATUS_PLANNING_WITH_MAIML',
    'P_STATUS_IN_PROGRESS_CO',
    'P_STATUS_REVIEW_WAITING',
    'P_STATUS_COMPLETED'
);

-- ============================================================
-- チェック6: project_id の重複確認（主キー）
-- 期待値: 0行（重複なし）
-- 主キーは (organization_id, project_id) の複合キー
-- ============================================================
SELECT '=== チェック6: project_id の重複確認（主キー） ===' AS check_item;
SELECT organization_id, project_id, project_name
FROM project
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND project_id IN (
    'proj_grp_hq',
    'proj_grp_dev',
    'proj_grp_deva',
    'proj_grp_sales',
    'proj_grp_ext',
    'proj_st_plan_nm',
    'proj_st_plan_wm',
    'proj_st_inprog',
    'proj_st_review',
    'proj_st_done'
  );

-- ============================================================
-- チェック7: organization_group_cd の重複確認
-- 期待値: 0行（重複なし）
-- ============================================================
SELECT '=== チェック7: organization_group の重複確認 ===' AS check_item;
SELECT organization_group_cd, organization_group_name, is_active
FROM organization_group
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid
  AND organization_group_cd IN ('HQ', 'HQ-DEV', 'HQ-DEV-A', 'HQ-SALES', 'EXTERNAL');

-- ============================================================
-- チェック8: file_metadata の project_uuid 重複確認
-- uk_file_metadata_project_uuid 制約（project_uuid はユニーク）
-- 期待値: 0行（重複なし）
-- ============================================================
SELECT '=== チェック8: file_metadata の project_uuid 重複確認 ===' AS check_item;
SELECT file_key, project_uuid
FROM file_metadata
WHERE project_uuid IN (
    'b1000002-0000-4000-8000-000000000002'::uuid,
    'b1000003-0000-4000-8000-000000000003'::uuid,
    'b1000004-0000-4000-8000-000000000004'::uuid,
    'b1000005-0000-4000-8000-000000000005'::uuid
);

-- ============================================================
-- まとめ: 問題がある場合の対処
-- ============================================================
-- チェック1が0行 → test_data_insert.sql を先に投入する
-- チェック2が0行 → role_cd を既存の値に合わせるか role テーブルを確認する
-- チェック3に行あり → ON CONFLICT DO NOTHING でスキップされるため問題なし
--                    ただし role_cd など既存値と差異がある場合は要確認
-- チェック4が0行 → EXTERNAL グループの chief を別の既存ユーザーに変更する
-- チェック5に行あり → project_name が重複している。該当行を削除するか
--                     テストデータの project_name を変更する
-- チェック6に行あり → project_id が重複している。該当行を削除するか
--                     テストデータの project_id を変更する
-- チェック7に行あり → ON CONFLICT DO NOTHING でスキップされるため問題なし
-- チェック8に行あり → file_metadata の既存レコードと project_uuid が衝突している
--                     既存レコードを削除するか uuid を変更する
