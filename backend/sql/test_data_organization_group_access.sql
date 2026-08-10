-- ============================================================
-- organization_group によるプロジェクト閲覧・編集権限 動作確認用テストデータ
--
-- 対象組織: AIML研究所（organization_id: a0718dc5-21f3-44e6-87e9-cc2ae83f3385）
-- 作成日: 2026-08-05
-- 仕様書: docs/design/spec/organization_group_project_access.md
--
-- ============================================================
-- 検証シナリオ A: グループアクセス制御
--   A-1. 親グループ所属ユーザーは配下グループのプロジェクトも閲覧可（ただし編集不可）
--   A-2. 直接所属グループのプロジェクトのみ編集可
--   A-3. 無関係グループのプロジェクトは閲覧不可
--   A-4. is_active=false のグループでも有効祖先グループ所属なら閲覧可
--   A-5. is_active=false のグループの chief_user_id なら編集可
--   A-6. SystemAdmin は全件閲覧・編集可
--
-- 検証シナリオ B: プロジェクトステータス×MAIML×チェックアウト状態
--   B-1. 計画中 / MAIMLなし / チェックイン
--   B-2. 計画中 / MAIMLあり / チェックイン
--   B-3. タスク実行待ち〜タスク実行中 / チェックアウト中
--   B-4. タスクレビュー待ち / チェックイン
--   B-5. 完了 / チェックイン
-- ============================================================
-- 前提: test_data_insert.sql が投入済みであること（organization, organization_user が存在する）
-- 冪等実行: ON CONFLICT DO NOTHING を使用
-- ============================================================

-- ============================================================
-- Step 1. 追加ユーザーの登録
--
-- user_id はメールアドレス形式（ログイン時に使用）
-- パスワードはすべて "test123"（bcrypt $2b$12$ ハッシュ）
--
-- 追加ユーザー:
--   hq_user@example.com    → HQ グループ代表（experiment_admin）
--   dev_user@example.com   → HQ-DEV グループ代表（experiment_admin）
--   dev_a_user@example.com → HQ-DEV-A グループ代表（experiment_admin）
--   sales_user@example.com → HQ-SALES グループ代表（experiment_admin）
--   multi_user@example.com → HQ + HQ-DEV 両方所属（experiment_admin）
--   no_group_user@example.com → グループ未所属（experiment_admin）
-- ============================================================

INSERT INTO organization_user (
    user_id,
    organization_id,
    user_name,
    role_cd,
    mail_address,
    is_active,
    create_user_id,
    update_user_id,
    create_at,
    update_at
) VALUES
-- HQ グループの代表者（親グループユーザー）
(
    'hq_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'hq_user',
    'experiment_admin',
    'hq_user@example.com',
    true, 'system.admin@example.com', 'system.admin@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
-- HQ-DEV グループの代表者（子グループユーザー）
(
    'dev_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'dev_user',
    'experiment_admin',
    'dev_user@example.com',
    true, 'system.admin@example.com', 'system.admin@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
-- HQ-DEV-A グループの代表者（孫グループ・非アクティブグループユーザー）
(
    'dev_a_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'dev_a_user',
    'experiment_admin',
    'dev_a_user@example.com',
    true, 'system.admin@example.com', 'system.admin@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
-- HQ-SALES グループの代表者（別系統グループユーザー）
(
    'sales_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'sales_user',
    'experiment_admin',
    'sales_user@example.com',
    true, 'system.admin@example.com', 'system.admin@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
-- HQ・HQ-DEV の両方に所属（複数グループ所属ユーザー）
(
    'multi_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'multi_group_user',
    'experiment_admin',
    'multi_user@example.com',
    true, 'system.admin@example.com', 'system.admin@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
-- どのグループにも所属しないユーザー（0件確認用）
(
    'no_group_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'no_group_user',
    'experiment_admin',
    'no_group_user@example.com',
    true, 'system.admin@example.com', 'system.admin@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ============================================================
-- Step 1-B. user_authentication テーブルへの認証情報登録
--
-- パスワード: test123
-- ハッシュ  : bcrypt $2b$12$（既存テストデータと同一ラウンド数）
-- ※ 既存の exp123 ハッシュを流用（ログイン確認には実際のハッシュ生成を推奨）
--    正確な test123 ハッシュを使いたい場合:
--    node -e "const b=require('bcrypt'); b.hash('test123',12).then(h=>console.log(h))"
-- ============================================================
INSERT INTO user_authentication (
    user_id,
    organization_id,
    password,
    is_temporary_flg,
    create_user_id,
    update_user_id,
    create_at,
    update_at
) VALUES
(
    'hq_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    '$2b$12$adW8/slrYcFOBFRffBH.BeUiffi/9R2tdWKHT3ftZX9GvwfHhmnW6',
    false, '2', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'dev_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    '$2b$12$adW8/slrYcFOBFRffBH.BeUiffi/9R2tdWKHT3ftZX9GvwfHhmnW6',
    false, '2', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'dev_a_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    '$2b$12$adW8/slrYcFOBFRffBH.BeUiffi/9R2tdWKHT3ftZX9GvwfHhmnW6',
    false, '2', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'sales_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    '$2b$12$adW8/slrYcFOBFRffBH.BeUiffi/9R2tdWKHT3ftZX9GvwfHhmnW6',
    false, '2', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'multi_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    '$2b$12$adW8/slrYcFOBFRffBH.BeUiffi/9R2tdWKHT3ftZX9GvwfHhmnW6',
    false, '2', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
    'no_group_user@example.com',
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    '$2b$12$adW8/slrYcFOBFRffBH.BeUiffi/9R2tdWKHT3ftZX9GvwfHhmnW6',
    false, '2', '2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ============================================================
-- Step 2. organization_group テーブルへのグループ登録
--
-- 階層構造:
--   HQ（ルート・アクティブ） ← chief: hq_user@example.com
--   ├── HQ-DEV（子・アクティブ） ← chief: dev_user@example.com
--   │   └── HQ-DEV-A（孫・is_active=false）← chief: dev_a_user@example.com
--   └── HQ-SALES（子・アクティブ） ← chief: sales_user@example.com
--   EXTERNAL（別ルート・アクティブ） ← chief: exp.admin@example.com（既存ユーザー）
-- ============================================================

INSERT INTO organization_group (
    organization_id,
    organization_group_cd,
    organization_group_name,
    chief_user_id,
    parent_group_cd,
    layer,
    is_active,
    create_user_id,
    create_at,
    update_user_id,
    update_at
) VALUES
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'HQ', '本社', 'hq_user@example.com', NULL, 'L1', true,
    'system.admin@example.com', CURRENT_TIMESTAMP, 'system.admin@example.com', CURRENT_TIMESTAMP
),
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'HQ-DEV', '本社 開発部', 'dev_user@example.com', 'HQ', 'L2', true,
    'system.admin@example.com', CURRENT_TIMESTAMP, 'system.admin@example.com', CURRENT_TIMESTAMP
),
-- 非アクティブグループ（HQ-DEV-A）
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'HQ-DEV-A', '本社 開発部 Aチーム', 'dev_a_user@example.com', 'HQ-DEV', 'L3', false,
    'system.admin@example.com', CURRENT_TIMESTAMP, 'system.admin@example.com', CURRENT_TIMESTAMP
),
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'HQ-SALES', '本社 営業部', 'sales_user@example.com', 'HQ', 'L2', true,
    'system.admin@example.com', CURRENT_TIMESTAMP, 'system.admin@example.com', CURRENT_TIMESTAMP
),
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'EXTERNAL', '外部パートナー', 'exp.admin@example.com', NULL, 'L1', true,
    'system.admin@example.com', CURRENT_TIMESTAMP, 'system.admin@example.com', CURRENT_TIMESTAMP
)
ON CONFLICT (organization_id, organization_group_cd) DO NOTHING;

-- ============================================================
-- Step 3. organization_group_user テーブルへのグループ所属登録
-- ============================================================

INSERT INTO organization_group_user (
    organization_id,
    organization_group_cd,
    user_id,
    create_user_id,
    create_at
) VALUES
-- hq_user → HQ に所属
('a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid, 'HQ',       'hq_user@example.com',    'system.admin@example.com', CURRENT_TIMESTAMP),
-- dev_user → HQ-DEV に所属
('a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid, 'HQ-DEV',   'dev_user@example.com',   'system.admin@example.com', CURRENT_TIMESTAMP),
-- dev_a_user → HQ-DEV-A に所属（非アクティブグループ）
('a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid, 'HQ-DEV-A', 'dev_a_user@example.com', 'system.admin@example.com', CURRENT_TIMESTAMP),
-- sales_user → HQ-SALES に所属
('a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid, 'HQ-SALES', 'sales_user@example.com', 'system.admin@example.com', CURRENT_TIMESTAMP),
-- multi_group_user → HQ と HQ-DEV の両方に所属
('a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid, 'HQ',       'multi_user@example.com', 'system.admin@example.com', CURRENT_TIMESTAMP),
('a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid, 'HQ-DEV',   'multi_user@example.com', 'system.admin@example.com', CURRENT_TIMESTAMP)
-- no_group_user はグループ所属なし（INSERT しない）
ON CONFLICT (organization_id, organization_group_cd, user_id) DO NOTHING;

-- ============================================================
-- Step 4. project テーブルへのプロジェクト登録
--
-- ── グループアクセス制御確認用プロジェクト（シナリオ A）──
--   P_HQ       → HQ グループ
--   P_HQ_DEV   → HQ-DEV グループ
--   P_HQ_DEV_A → HQ-DEV-A グループ（非アクティブグループ）
--   P_HQ_SALES → HQ-SALES グループ
--   P_EXTERNAL → EXTERNAL グループ（HQ系とは無関係）
--
-- ── ステータス×MAIML×チェックアウト確認用プロジェクト（シナリオ B）──
--   全て HQ-DEV グループ所属（dev_user が編集可能なグループ）
--
--   P_STATUS_PLANNING_NO_MAIML  → 計画中 / MAIMLなし / チェックイン
--   P_STATUS_PLANNING_WITH_MAIML→ 計画中 / MAIMLあり / チェックイン
--   P_STATUS_TASK_PENDING       → タスク実行待ち / MAIMLあり / チェックアウト中（owner: dev_user）
--   P_STATUS_IN_PROGRESS_CO     → タスク実行中 / チェックアウト中（owner: dev_user）
--   P_STATUS_REVIEW_WAITING     → タスクレビュー待ち / チェックイン
--   P_STATUS_COMPLETED          → 完了 / チェックイン
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
) VALUES

-- ────────────────────────────────────────────────────
-- シナリオ A: グループアクセス制御確認
-- ────────────────────────────────────────────────────

-- A-1: HQ グループのプロジェクト
--      閲覧可: hq_user, multi_user
--      編集可: hq_user, multi_user（HQ直接所属者）
--      閲覧不可: dev_user（HQ-DEV専属）, sales_user, no_group_user
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'proj_grp_hq',
    'P_HQ',
    '[グループA-1] HQグループ直下のプロジェクト',
    'HQ', 0, false, 0,     -- PLANNING / MAIMLなし / CHECKED_IN
    'hq_user@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    'hq_user@example.com', 'hq_user@example.com'
),

-- A-2: HQ-DEV グループのプロジェクト
--      閲覧可: hq_user（祖先）, dev_user, multi_user
--      編集可: dev_user, multi_user（HQ-DEV直接所属者）
--      閲覧不可: sales_user, no_group_user
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'proj_grp_dev',
    'P_HQ_DEV',
    '[グループA-2] HQ-DEVグループのプロジェクト',
    'HQ-DEV', 0, false, 0,     -- PLANNING / MAIMLなし / CHECKED_IN
    'dev_user@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    'dev_user@example.com', 'dev_user@example.com'
),

-- A-3: HQ-DEV-A グループのプロジェクト（非アクティブグループ）
--      閲覧可: 有効祖先 HQ/HQ-DEV 所属者（hq_user, dev_user, multi_user）
--              dev_a_user は非アクティブグループ直接所属のため閲覧不可
--      編集可: HQ の chief（hq_user）、HQ-DEV の chief（dev_user）← 有効祖先グループ代表者特例
--              ※ dev_a_user は非アクティブグループ HQ-DEV-A に直接所属するのみ → 編集不可
--      閲覧不可: dev_a_user, sales_user, no_group_user
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'proj_grp_deva',
    'P_HQ_DEV_A',
    '[グループA-3] HQ-DEV-Aグループのプロジェクト（非アクティブグループ）',
    'HQ-DEV-A', 0, false, 0,     -- PLANNING / MAIMLなし / CHECKED_IN
    'dev_a_user@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    'dev_a_user@example.com', 'dev_a_user@example.com'
),

-- A-4: HQ-SALES グループのプロジェクト
--      閲覧可: hq_user（祖先）, sales_user, multi_user（HQ所属）
--      編集可: sales_user（HQ-SALES直接所属者）
--      閲覧不可: dev_user（HQ-DEV専属）, no_group_user
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'proj_grp_sales',
    'P_HQ_SALES',
    '[グループA-4] HQ-SALESグループのプロジェクト',
    'HQ-SALES', 0, false, 0,     -- PLANNING / MAIMLなし / CHECKED_IN
    'sales_user@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    'sales_user@example.com', 'sales_user@example.com'
),

-- A-5: EXTERNAL グループのプロジェクト（HQ系とは無関係）
--      閲覧可: EXTERNAL の chief（exp.admin@example.com）のみ
--      閲覧不可: HQ系全ユーザー
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'proj_grp_ext',
    'P_EXTERNAL',
    '[グループA-5] EXTERNALグループのプロジェクト（HQ系ユーザーは閲覧不可）',
    'EXTERNAL', 0, false, 0,     -- PLANNING / MAIMLなし / CHECKED_IN
    'exp.admin@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    'exp.admin@example.com', 'exp.admin@example.com'
),

-- ────────────────────────────────────────────────────
-- シナリオ B: ステータス × MAIML × チェックアウト確認
-- 全て HQ-DEV グループ（閲覧: HQ/HQ-DEV所属, 編集: HQ-DEV直接所属）
-- ────────────────────────────────────────────────────

-- B-1: 計画中 / MAIMLファイルなし / チェックイン
--      → MAIMLアップロード前の初期状態
--        チェックアウト・タスク登録・指示送信などが未着手
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'proj_st_plan_nm',
    'P_STATUS_PLANNING_NO_MAIML',
    '[状態B-1] 計画中 / MAIMLなし / チェックイン',
    'HQ-DEV',
    0,     -- PLANNING
    false, -- MAIMLなし
    0,     -- CHECKED_IN
    'dev_user@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    'dev_user@example.com', 'dev_user@example.com'
),

-- B-2: 計画中 / MAIMLファイルあり / チェックイン
--      → MAIMLアップロード済みだがタスク未登録
--        チェックアウトしてタスク登録が可能な状態
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'proj_st_plan_wm',
    'P_STATUS_PLANNING_WITH_MAIML',
    '[状態B-2] 計画中 / MAIMLあり / チェックイン',
    'HQ-DEV',
    0,     -- PLANNING
    true,  -- MAIMLあり
    0,     -- CHECKED_IN
    'dev_user@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    'dev_user@example.com', 'dev_user@example.com'
),

-- B-2.5: タスク実行待ち / MAIMLあり / チェックアウト中（owner=dev_user）
--        → MAIMLあり・タスク登録済み・チェックアウト状態（作業開始前）
--          project_status=1（TASK_PENDING）は checkout_status=1（CHECKED_OUT）と
--          同時にセットされる。チェックアウト直後・タスク着手前の状態。
(
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
),

-- B-3: タスク実行中 / MAIMLあり / チェックアウト中（owner=dev_user）
--      → タスク作業進行中。別ユーザーによるチェックアウト不可を確認
--        checkout_status=1（CHECKED_OUT）
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'proj_st_inprog',
    'P_STATUS_IN_PROGRESS_CO',
    '[状態B-3] タスク実行中 / MAIMLあり / チェックアウト中（dev_userがチェックアウト）',
    'HQ-DEV',
    2,     -- TASK_IN_PROGRESS
    true,  -- MAIMLあり
    1,     -- CHECKED_OUT
    'dev_user@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    'dev_user@example.com', 'dev_user@example.com'
),

-- B-4: タスクレビュー待ち / MAIMLあり / チェックイン
--      → 実験作業者が承認依頼を送信した状態
--        実験管理者がレビュー（タスク確認完了ボタン）を押す前
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'proj_st_review',
    'P_STATUS_REVIEW_WAITING',
    '[状態B-4] タスクレビュー待ち / MAIMLあり / チェックイン',
    'HQ-DEV',
    3,     -- REVIEW_WAITING
    true,  -- MAIMLあり
    0,     -- CHECKED_IN
    'dev_user@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    'dev_user@example.com', 'dev_user@example.com'
),

-- B-5: 完了 / MAIMLあり / チェックイン
--      → プロジェクト完了済み
--        include_completed=false のフィルタで非表示になることを確認
(
    'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'::uuid,
    'proj_st_done',
    'P_STATUS_COMPLETED',
    '[状態B-5] 完了 / MAIMLあり / チェックイン',
    'HQ-DEV',
    4,     -- COMPLETED
    true,  -- MAIMLあり
    0,     -- CHECKED_IN
    'dev_user@example.com', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    'dev_user@example.com', 'dev_user@example.com'
)
ON CONFLICT (project_name) DO NOTHING;

-- ============================================================
-- ✅ 動作確認クエリ
-- ============================================================

-- 確認1: グループ一覧（階層構造・アクティブ状態）
SELECT
    organization_group_cd AS grp_cd,
    organization_group_name AS grp_name,
    parent_group_cd AS parent,
    chief_user_id AS chief,
    is_active
FROM organization_group
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND organization_group_cd IN ('HQ', 'HQ-DEV', 'HQ-DEV-A', 'HQ-SALES', 'EXTERNAL')
ORDER BY grp_cd;

-- 確認2: グループ所属ユーザー一覧
SELECT
    gu.organization_group_cd AS grp_cd,
    og.organization_group_name AS grp_name,
    gu.user_id,
    ou.user_name
FROM organization_group_user gu
JOIN organization_group og
    ON og.organization_id = gu.organization_id
    AND og.organization_group_cd = gu.organization_group_cd
JOIN organization_user ou
    ON ou.user_id = gu.user_id
    AND ou.organization_id = gu.organization_id
WHERE gu.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND gu.organization_group_cd IN ('HQ', 'HQ-DEV', 'HQ-DEV-A', 'HQ-SALES', 'EXTERNAL')
ORDER BY gu.organization_group_cd, gu.user_id;

-- 確認3: プロジェクト一覧（グループ・ステータス・MAIML・チェックアウト状態）
SELECT
    p.project_name,
    p.organization_group_cd AS grp_cd,
    og.is_active AS grp_active,
    p.project_status,
    CASE p.project_status
        WHEN 0 THEN 'PLANNING'
        WHEN 1 THEN 'TASK_PENDING'
        WHEN 2 THEN 'TASK_IN_PROGRESS'
        WHEN 3 THEN 'REVIEW_WAITING'
        WHEN 4 THEN 'COMPLETED'
        WHEN 5 THEN 'ERROR'
    END AS status_name,
    p.project_maiml_flg AS maiml,
    p.checkout_status,
    CASE p.checkout_status
        WHEN 0 THEN 'CHECKED_IN'
        WHEN 1 THEN 'CHECKED_OUT'
    END AS checkout_name,
    p.owner_user_id AS owner
FROM project p
JOIN organization_group og
    ON og.organization_id = p.organization_id
    AND og.organization_group_cd = p.organization_group_cd
WHERE p.organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND p.project_name IN (
    'P_HQ', 'P_HQ_DEV', 'P_HQ_DEV_A', 'P_HQ_SALES', 'P_EXTERNAL',
    'P_STATUS_PLANNING_NO_MAIML', 'P_STATUS_PLANNING_WITH_MAIML',
    'P_STATUS_TASK_PENDING',
    'P_STATUS_IN_PROGRESS_CO', 'P_STATUS_REVIEW_WAITING', 'P_STATUS_COMPLETED'
  )
ORDER BY p.project_name;

-- ============================================================
-- ✅ ユーザー別 期待閲覧・編集マトリクス（参考）
-- ============================================================
-- ┌──────────────────────────┬──────────┬──────────┬───────────┬───────────┬─────────────┐
-- │ プロジェクト              │ hq_user  │ dev_user │dev_a_user │sales_user │ multi_user  │
-- │                          │ HQ       │ HQ-DEV   │ HQ-DEV-A  │ HQ-SALES  │ HQ+HQ-DEV   │
-- ├──────────────────────────┼──────────┼──────────┼───────────┼───────────┼─────────────┤
-- │ P_HQ（HQ）               │ 閲・編   │ 閲覧のみ │ ×         │ 閲覧のみ  │ 閲・編      │
-- │ P_HQ_DEV（HQ-DEV）       │ 閲覧のみ │ 閲・編   │ ×         │ ×         │ 閲・編      │
-- │ P_HQ_DEV_A（非アクティブ）│ 閲覧のみ │ 閲覧のみ │ 閲・編*   │ ×         │ 閲覧のみ    │
-- │ P_HQ_SALES（HQ-SALES）   │ 閲覧のみ │ ×        │ ×         │ 閲・編    │ 閲覧のみ    │
-- │ P_EXTERNAL（EXTERNAL）   │ ×        │ ×        │ ×         │ ×         │ ×           │
-- │ P_STATUS_*（HQ-DEV）     │ 閲覧のみ │ 閲・編   │ ×         │ ×         │ 閲・編      │
-- ├──────────────────────────┼──────────┼──────────┼───────────┼───────────┼─────────────┤
-- │ no_group_user（未所属）   │ ×        │ ×        │ ×         │ ×         │ —           │
-- │ system.admin（SystemAdmin）│全閲・全編│全閲・全編│全閲・全編 │全閲・全編 │ 全閲・全編  │
-- └──────────────────────────┴──────────┴──────────┴───────────┴───────────┴─────────────┘
-- * P_HQ_DEV_A: dev_a_user は非アクティブグループ HQ-DEV-A の chief なので編集可（特例）

-- ============================================================
-- ✅ ステータスパターン一覧（シナリオBのプロジェクトのみ）
-- ============================================================
-- ┌──────────────────────────────┬──────────────────┬──────────┬─────────────┐
-- │ プロジェクト名               │ project_status   │ maiml_flg│ checkout    │
-- ├──────────────────────────────┼──────────────────┼──────────┼─────────────┤
-- │ P_STATUS_PLANNING_NO_MAIML   │ 0: PLANNING      │ false    │ CHECKED_IN  │
-- │ P_STATUS_PLANNING_WITH_MAIML │ 0: PLANNING      │ true     │ CHECKED_IN  │
-- │ P_STATUS_TASK_PENDING        │ 1: TASK_PENDING  │ true     │ CHECKED_OUT │
-- │ P_STATUS_IN_PROGRESS_CO      │ 2: IN_PROGRESS   │ true     │ CHECKED_OUT │
-- │ P_STATUS_REVIEW_WAITING      │ 3: REVIEW_WAITING│ true     │ CHECKED_IN  │
-- │ P_STATUS_COMPLETED           │ 4: COMPLETED     │ true     │ CHECKED_IN  │
-- └──────────────────────────────┴──────────────────┴──────────┴─────────────┘

-- ============================================================
-- ✅ データクリーンアップ（テストデータ削除時に使用）
-- ============================================================
/*
DELETE FROM project
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND project_name IN (
    'P_HQ', 'P_HQ_DEV', 'P_HQ_DEV_A', 'P_HQ_SALES', 'P_EXTERNAL',
    'P_STATUS_PLANNING_NO_MAIML', 'P_STATUS_PLANNING_WITH_MAIML',
    'P_STATUS_TASK_PENDING',
    'P_STATUS_IN_PROGRESS_CO', 'P_STATUS_REVIEW_WAITING', 'P_STATUS_COMPLETED'
  );

DELETE FROM organization_group_user
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND organization_group_cd IN ('HQ', 'HQ-DEV', 'HQ-DEV-A', 'HQ-SALES', 'EXTERNAL');

DELETE FROM organization_group
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND organization_group_cd IN ('HQ', 'HQ-DEV', 'HQ-DEV-A', 'HQ-SALES', 'EXTERNAL');

DELETE FROM user_authentication
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND user_id IN (
    'hq_user@example.com', 'dev_user@example.com', 'dev_a_user@example.com',
    'sales_user@example.com', 'multi_user@example.com', 'no_group_user@example.com'
  );

DELETE FROM organization_user
WHERE organization_id = 'a0718dc5-21f3-44e6-87e9-cc2ae83f3385'
  AND user_id IN (
    'hq_user@example.com', 'dev_user@example.com', 'dev_a_user@example.com',
    'sales_user@example.com', 'multi_user@example.com', 'no_group_user@example.com'
  );
*/
