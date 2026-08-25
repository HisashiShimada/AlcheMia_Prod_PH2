-- ============================================================
-- project_overall_evaluations テスト用シードデータ
--
-- @description
--   開発DB / テストDBへの手動投入用シード。
--   evaluation_seq は SERIAL のため INSERT 時は指定不要（自動採番）。
--
-- @前提条件
--   以下が事前に存在すること:
--     - organization: id = '00000000-0000-0000-0000-000000000001'
--     - project:      organization_id 上記, project_id = 'PROJ-TEST-001'
--     - aggregation_rules_seed.sql が適用済み（全体評価の applied_rule_id 参照のため）
--
-- @テストデータ構成
--   設計書 §6.3 サンプル7件に対応:
--     METHOD  × 2件 （method_001: 良好 / method_002: 要確認）
--     TASK    × 2件 （method_001 task1: 良好 / task2: 不良）
--     TRANSITION_METHOD × 1件 （T001: 良好）
--     TRANSITION_TASK   × 2件 （T002: 良好 / T003: 要確認）
--     MAIML_PROJECT × 1件 （全体評価: 要確認 / スコア75）
--
-- @使用方法
--   psql -U <user> -d <dbname> -f project_overall_evaluations_seed.sql
--
-- @date 2026-08-20
-- ============================================================

-- テスト用定数
-- organization_id  : 00000000-0000-0000-0000-000000000001
-- project_id       : PROJ-TEST-001
-- evaluated_user_id: 99999999-0000-0000-0000-000000000001 (テスト評価者)
-- applied_rule_id  : 11111111-0000-0000-0000-000000000002 (aggregation_rules_seed v2)

-- ── 下位評価: METHOD ──
INSERT INTO project_overall_evaluations (
  organization_id, project_id, evaluation_scope,
  method_id, task_no, transition_id,
  evaluated_user_id, evaluated_at,
  overall_digital, overall_analog,
  create_user_id, create_at, update_user_id, update_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000001', 'PROJ-TEST-001', 'METHOD',
    'method_001', NULL, NULL,
    '99999999-0000-0000-0000-000000000001', NOW(),
    '良好', 'メソッド1は問題なし',
    '99999999-0000-0000-0000-000000000001', NOW(), NULL, NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000001', 'PROJ-TEST-001', 'METHOD',
    'method_002', NULL, NULL,
    '99999999-0000-0000-0000-000000000001', NOW(),
    '要確認', 'メソッド2は要確認事項あり',
    '99999999-0000-0000-0000-000000000001', NOW(), NULL, NOW()
  );

-- ── 下位評価: TASK ──
INSERT INTO project_overall_evaluations (
  organization_id, project_id, evaluation_scope,
  method_id, task_no, transition_id,
  evaluated_user_id, evaluated_at,
  overall_digital, overall_analog,
  create_user_id, create_at, update_user_id, update_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000001', 'PROJ-TEST-001', 'TASK',
    'method_001', 1, NULL,
    '99999999-0000-0000-0000-000000000001', NOW(),
    '良好', NULL,
    '99999999-0000-0000-0000-000000000001', NOW(), NULL, NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000001', 'PROJ-TEST-001', 'TASK',
    'method_001', 2, NULL,
    '99999999-0000-0000-0000-000000000001', NOW(),
    '不良', 'タスク2で重大な問題が発生。詳細は別途報告書参照。',
    '99999999-0000-0000-0000-000000000001', NOW(), NULL, NOW()
  );

-- ── 下位評価: TRANSITION_METHOD ──
INSERT INTO project_overall_evaluations (
  organization_id, project_id, evaluation_scope,
  method_id, task_no, transition_id,
  evaluated_user_id, evaluated_at,
  overall_digital, overall_analog,
  create_user_id, create_at, update_user_id, update_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000001', 'PROJ-TEST-001', 'TRANSITION_METHOD',
    'method_001', NULL, 'T001',
    '99999999-0000-0000-0000-000000000001', NOW(),
    '良好', NULL,
    '99999999-0000-0000-0000-000000000001', NOW(), NULL, NOW()
  );

-- ── 下位評価: TRANSITION_TASK ──
INSERT INTO project_overall_evaluations (
  organization_id, project_id, evaluation_scope,
  method_id, task_no, transition_id,
  evaluated_user_id, evaluated_at,
  overall_digital, overall_analog,
  create_user_id, create_at, update_user_id, update_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000001', 'PROJ-TEST-001', 'TRANSITION_TASK',
    'method_001', 1, 'T002',
    '99999999-0000-0000-0000-000000000001', NOW(),
    '良好', NULL,
    '99999999-0000-0000-0000-000000000001', NOW(), NULL, NOW()
  ),
  (
    '00000000-0000-0000-0000-000000000001', 'PROJ-TEST-001', 'TRANSITION_TASK',
    'method_001', 2, 'T003',
    '99999999-0000-0000-0000-000000000001', NOW(),
    '要確認', 'T003は軽微な差異あり',
    '99999999-0000-0000-0000-000000000001', NOW(), NULL, NOW()
  );

-- ── 全体評価: MAIML_PROJECT ──
-- 設計書サンプル7件を集計した結果: 要確認 / スコア75
-- applied_rule_snapshot / aggregation_snapshot は実運用時に自動生成されるため
-- シードでは NULL を許容しない（レコードの存在確認用途）
INSERT INTO project_overall_evaluations (
  organization_id, project_id, evaluation_scope,
  evaluated_user_id, evaluated_at,
  overall_digital, overall_score, overall_analog,
  applied_rule_id, applied_rule_version,
  applied_rule_snapshot, aggregation_snapshot,
  create_user_id, create_at, update_user_id, update_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000001', 'PROJ-TEST-001', 'MAIML_PROJECT',
    '99999999-0000-0000-0000-000000000001', NOW(),
    '要確認', 75, 'タスク2の不良を受けプロジェクト全体として要確認と判定。',
    '11111111-0000-0000-0000-000000000002', 2,
    '{}', '{}',
    '99999999-0000-0000-0000-000000000001', NOW(), NULL, NOW()
  );
