-- =============================================
-- テストデータINSERT文
-- 生成日時: 2026-01-07
-- =============================================

-- =============================================
-- 1. organizationテーブル
-- =============================================
INSERT INTO organization (
    organization_name,
    organization_display_name,
    organization_prefix,
    organization_email,
    is_active,
    create_at,
    update_at
) VALUES
(
    'システム管理組織',
    'システム管理組織',
    'system_admin_org',
    'system@example.com',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'AIML研究所',
    'AIML研究所',
    'maiml_lab_001',
    'lab001@example.com',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- =============================================
-- 2. organization_userテーブル
-- =============================================
INSERT INTO organization_user (
    user_id,
    organization_id,
    user_name,
    role,
    mail_address,
    locked_until,
    last_login,
    is_active,
    create_at,
    update_at
) VALUES
-- Provider（システム管理組織）
(
    '1',
    '{c9621ed6-5def-4970-8e7f-fbe97c98e3ed}'::uuid,
    'provider',
    'provider',
    'provider@example.com',
    NULL,
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- System Admin（AIML研究所）
(
    '2',
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'system_admin',
    'system_admin',
    'system.admin@example.com',
    NULL,
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Data Admin（AIML研究所）
(
    '3',
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'data_admin',
    'data_admin',
    'data.admin@example.com',
    NULL,
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Experiment Admin（AIML研究所）
(
    '4',
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'experiment_admin',
    'experiment_admin',
    'exp.admin@example.com',
    NULL,
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Experiment Worker（AIML研究所）
(
    '5',
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'experiment_worker',
    'experiment_worker',
    'worker@example.com',
    NULL,
    NULL,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- =============================================
-- 3. role_permissionテーブル
-- =============================================
-- Provider権限（全機能アクセス可能）
INSERT INTO role_permission (role, function_id, permission) VALUES
('provider', 'SYSTEM_MANAGEMENT', 'CRUD'),
('provider', 'ORGANIZATION_MANAGEMENT', 'CRUD'),
('provider', 'USER_MANAGEMENT', 'CRUD'),
('provider', 'PROJECT_MANAGEMENT', 'CRUD'),
('provider', 'EXPERIMENT_MANAGEMENT', 'CRUD'),
('provider', 'DATA_MANAGEMENT', 'CRUD'),
('provider', 'REPORT_VIEW', 'R');

-- System Admin権限（システム管理・組織管理）
INSERT INTO role_permission (role, function_id, permission) VALUES
('system_admin', 'SYSTEM_MANAGEMENT', 'CRUD'),
('system_admin', 'ORGANIZATION_MANAGEMENT', 'CRUD'),
('system_admin', 'USER_MANAGEMENT', 'CRUD'),
('system_admin', 'PROJECT_MANAGEMENT', 'R'),
('system_admin', 'EXPERIMENT_MANAGEMENT', 'R'),
('system_admin', 'DATA_MANAGEMENT', 'R'),
('system_admin', 'REPORT_VIEW', 'R');

-- Data Admin権限（データ管理）
INSERT INTO role_permission (role, function_id, permission) VALUES
('data_admin', 'DATA_MANAGEMENT', 'CRUD'),
('data_admin', 'PROJECT_MANAGEMENT', 'RU'),
('data_admin', 'EXPERIMENT_MANAGEMENT', 'R'),
('data_admin', 'REPORT_VIEW', 'R');

-- Experiment Admin権限（実験管理）
INSERT INTO role_permission (role, function_id, permission) VALUES
('experiment_admin', 'EXPERIMENT_MANAGEMENT', 'CRUD'),
('experiment_admin', 'PROJECT_MANAGEMENT', 'RU'),
('experiment_admin', 'DATA_MANAGEMENT', 'RU'),
('experiment_admin', 'USER_MANAGEMENT', 'R'),
('experiment_admin', 'REPORT_VIEW', 'R');

-- Experiment Worker権限（実験作業）
INSERT INTO role_permission (role, function_id, permission) VALUES
('experiment_worker', 'EXPERIMENT_MANAGEMENT', 'RU'),
('experiment_worker', 'DATA_MANAGEMENT', 'RU'),
('experiment_worker', 'REPORT_VIEW', 'R');

-- MI Engineer権限（追加ロール）
INSERT INTO role_permission (role, function_id, permission) VALUES
('mi_engineer', 'DATA_MANAGEMENT', 'CRUD'),
('mi_engineer', 'EXPERIMENT_MANAGEMENT', 'R'),
('mi_engineer', 'PROJECT_MANAGEMENT', 'R'),
('mi_engineer', 'REPORT_VIEW', 'CRUD');

-- =============================================
-- 4. user_authenticationテーブル
-- =============================================
INSERT INTO user_authentication (
    user_id,
    organization_id,
    password,
    entry_flg,
    create_at,
    update_at
) VALUES
-- Provider（システム管理組織）
-- 平文パスワード: provider123
(
    '{fa521054-6f45-43f8-b37e-3cd34ee6c87b}',
    '{c9621ed6-5def-4970-8e7f-fbe97c98e3ed}'::uuid,
    '$2b$12$fyXPoxe4PZyrVNMXJcpIP.PSdvile32feIjl.4RM9UMGLyqF9ntmO',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- System Admin（AIML研究所）
-- 平文パスワード: admin123
(
    '{3b572113-40ed-44f7-9913-d797184b67d4}',
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    '$2b$12$vbtP32e7M7zDBqGxtsdfSesnM5WsDEHP.VHmf9u0McDJpgS0Kk/Om',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Data Admin（AIML研究所）
-- 平文パスワード: data123
(
    '{0a7acb10-753e-4bcc-b4ed-836d65e4598a}',
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    '$2b$12$m.9hNAJfchzKbKUdqoxf7uj3phhOHvei8w3KVnR6Mz/KpbjXQhiNG',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Experiment Admin（AIML研究所）
-- 平文パスワード: exp123
(
    '{686e0a8f-da93-48df-98b4-482fa4eb098b}',
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    '$2b$12$adW8/slrYcFOBFRffBH.BeUiffi/9R2tdWKHT3ftZX9GvwfHhmnW6',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Experiment Worker（AIML研究所）
-- 平文パスワード: worker123
(
    '{0c5d7815-5bc1-477f-9749-230b8156901e}',
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    '$2b$12$Enh8RlcXHMBRgbJny0vI5.F4GwHLTUSonypk/9n0aJUiVboTAA2xS',
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- =============================================
-- 5. code_masterテーブル
-- =============================================

-- プロジェクトステータス（AIML研究所）
INSERT INTO code_master (
    organization_id,
    code_division,
    code_value,
    code_name,
    code_description,
    code_remark
) VALUES
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'project_status',
    '0',
    'プロジェクト計画中',
    'プロジェクトの進捗ステータス',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'project_status',
    '1',
    'タスク実行待ち',
    'プロジェクトの進捗ステータス',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'project_status',
    '2',
    'タスク実行中',
    'プロジェクトの進捗ステータス',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'project_status',
    '3',
    'タスク結果レビュー待ち',
    'プロジェクトの進捗ステータス',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'project_status',
    '4',
    'プロジェクト完了',
    'プロジェクトの進捗ステータス',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'project_status',
    '5',
    'タスク異常終了',
    'プロジェクトの進捗ステータス',
    NULL
);

-- チェックアウトステータス（AIML研究所）
INSERT INTO code_master (
    organization_id,
    code_division,
    code_value,
    code_name,
    code_description,
    code_remark
) VALUES
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'checkout_status',
    '0',
    'チェックイン中',
    'プロジェクトのチェックアウト状態',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'checkout_status',
    '1',
    'チェックアウト済',
    'プロジェクトのチェックアウト状態',
    NULL
);

-- タスクステータス（AIML研究所）
INSERT INTO code_master (
    organization_id,
    code_division,
    code_value,
    code_name,
    code_description,
    code_remark
) VALUES
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'task_status',
    '0',
    '実行待ち',
    'タスクの進捗ステータス',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'task_status',
    '1',
    '実行中',
    'タスクの進捗ステータス',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'task_status',
    '2',
    'レビュー待ち',
    'タスクの進捗ステータス',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'task_status',
    '3',
    '完了',
    'タスクの進捗ステータス',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'task_status',
    '4',
    '異常終了',
    'タスクの進捗ステータス',
    NULL
);

-- 指示優先度（AIML研究所）
INSERT INTO code_master (
    organization_id,
    code_division,
    code_value,
    code_name,
    code_description,
    code_remark
) VALUES
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'instruction_priority',
    '0',
    '低',
    '実験指示の優先度',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'instruction_priority',
    '1',
    '通常',
    '実験指示の優先度',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'instruction_priority',
    '2',
    '中',
    '実験指示の優先度',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'instruction_priority',
    '3',
    '高',
    '実験指示の優先度',
    NULL
);

-- 指示タイプ（AIML研究所）
INSERT INTO code_master (
    organization_id,
    code_division,
    code_value,
    code_name,
    code_description,
    code_remark
) VALUES
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'instruction_type',
    '0',
    '一般',
    '実験指示のタイプ',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'instruction_type',
    '1',
    'セットアップ',
    '実験指示のタイプ',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'instruction_type',
    '2',
    '測定',
    '実験指示のタイプ',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'instruction_type',
    '3',
    '安全',
    '実験指示のタイプ',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'instruction_type',
    '4',
    '清掃',
    '実験指示のタイプ',
    NULL
);

-- 実験条件（AIML研究所）
INSERT INTO code_master (
    organization_id,
    code_division,
    code_value,
    code_name,
    code_description,
    code_remark
) VALUES
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'experiment_condition',
    '0',
    '全て同一条件で実行',
    '繰り返し実験時の条件指定',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'experiment_condition',
    '1',
    '実験ごとに条件を変更',
    '繰り返し実験時の条件指定',
    NULL
);

-- 指示範囲（AIML研究所）
INSERT INTO code_master (
    organization_id,
    code_division,
    code_value,
    code_name,
    code_description,
    code_remark
) VALUES
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'instruction_target',
    '0',
    'ファイル全体',
    '指示送信時の指示範囲',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'instruction_target',
    '1',
    '特定タスク',
    '指示送信時の指示範囲',
    NULL
),
(
    '{a0718dc5-21f3-44e6-87e9-cc2ae83f3385}'::uuid,
    'instruction_target',
    '2',
    '特定トランジション',
    '指示送信時の指示範囲',
    NULL
);

-- =============================================
-- 機能マスタテーブル（functionテーブル）用データ
-- =============================================
-- role_permissionで参照している機能IDの定義
-- 
-- INSERT INTO function (function_id, permission) VALUES
-- ('SYSTEM_MANAGEMENT', 'システム管理'),
-- ('ORGANIZATION_MANAGEMENT', '組織管理'),
-- ('USER_MANAGEMENT', 'ユーザー管理'),
-- ('PROJECT_MANAGEMENT', 'プロジェクト管理'),
-- ('EXPERIMENT_MANAGEMENT', '実験管理'),
-- ('DATA_MANAGEMENT', 'データ管理'),
-- ('REPORT_VIEW', 'レポート閲覧');

-- =============================================
-- 会社テーブル（corporationテーブル）用データ
-- =============================================
-- INSERT INTO corporation (corporation_code, corporation_name) VALUES
-- ('CORP_SYSTEM', 'システム管理会社'),
-- ('CORP_LAB001', 'AIML研究所株式会社');

-- =============================================
-- 実行順序の推奨
-- =============================================
-- 1. corporation テーブル
-- 2. organization テーブル
-- 3. function テーブル
-- 4. organization_user テーブル
-- 5. user_authentication テーブル（パスワードハッシュ化後）
-- 6. role_permission テーブル
-- 7. code_master テーブル
