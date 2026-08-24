-- ============================================================
-- aggregation_rules テスト用シードデータ
--
-- @description
--   開発DB / テストDBへの手動投入用シード。
--   既存データの重複を避けるため ON CONFLICT DO NOTHING を使用。
--
-- @前提条件
--   organization テーブルに以下のテスト組織が存在すること:
--     id = '00000000-0000-0000-0000-000000000001'
--
-- @テストデータ構成
--   - バージョン2（is_active = true）: 現在有効なルール（既定値）
--   - バージョン1（is_active = false）: 旧ルール（無効化済み・カスタム値）
--
-- @使用方法
--   psql -U <user> -d <dbname> -f aggregation_rules_seed.sql
--
-- @date 2026-08-20
-- ============================================================

-- テスト用定数
-- organization_id : 00000000-0000-0000-0000-000000000001
-- create_user_id  : 99999999-0000-0000-0000-000000000001 (テスト管理者)

-- ── バージョン2: 有効ルール（既定値・WORST_CASE 系）──
INSERT INTO aggregation_rules (
  rule_id,
  organization_id,
  version,
  is_active,
  score_good,
  score_caution,
  score_bad,
  target_rollup,
  level_status_rule,
  level_score_rule,
  missing_handling,
  transition_hierarchy,
  create_user_id,
  create_at,
  update_user_id,
  update_at
) VALUES (
  '11111111-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  2,
  true,
  100,
  50,
  0,
  'WORST_CASE',
  'WORST_CASE',
  'MEAN',
  'SEPARATE_COUNT',
  'MERGE',
  '99999999-0000-0000-0000-000000000001',
  NOW(),
  NULL,
  NOW()
) ON CONFLICT (organization_id, rule_id, version) DO NOTHING;

-- ── バージョン1: 旧ルール（is_active = false・カスタム値）──
INSERT INTO aggregation_rules (
  rule_id,
  organization_id,
  version,
  is_active,
  score_good,
  score_caution,
  score_bad,
  target_rollup,
  level_status_rule,
  level_score_rule,
  missing_handling,
  transition_hierarchy,
  create_user_id,
  create_at,
  update_user_id,
  update_at
) VALUES (
  '11111111-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  1,
  false,
  100,
  70,
  30,
  'MAJORITY',
  'MAJORITY',
  'MIN',
  'EXCLUDE_DENOMINATOR',
  'SPLIT',
  '99999999-0000-0000-0000-000000000001',
  NOW() - INTERVAL '30 days',
  '99999999-0000-0000-0000-000000000001',
  NOW()
) ON CONFLICT (organization_id, rule_id, version) DO NOTHING;
