-- マイグレーション: Alchemia システム共通名前空間の追加 + mgr-instruction キー移行
-- 作成日: 2026-08-12
-- 目的:
--   1. 固定UUID (00000000-0000-0000-0000-000000000000) を SYSTEM_ORGANIZATION_ID として
--      namespace / prefix / namespace_term に Alchemia 共通名前空間を INSERT する
--   2. project_instruction.instruction_key の旧キー → 新キーに UPDATE する
-- 注意:
--   - DBスキーマ変更なし（is_system カラムは追加しない）
--   - organization テーブルへのレコード追加なし（FK 制約がないことを確認済み）
--   - 全 INSERT は ON CONFLICT DO NOTHING で冪等

-- ────────────────────────────────────────────────────────────────
-- 1. namespace テーブルに Alchemia 名前空間を INSERT
-- ────────────────────────────────────────────────────────────────
INSERT INTO namespace (
  organization_id
  , namespace_id
  , scope_key
  , uri
  , global_flg
  , create_at
  , create_user_id
) VALUES (
  '00000000-0000-0000-0000-000000000000'
  , 'NS0001'
  , NULL
  , 'https://Alchemia.co.jp'
  , NULL
  , NOW()
  , 'system'
) ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 2. prefix テーブルに Alchemia prefix を INSERT
-- ────────────────────────────────────────────────────────────────
INSERT INTO prefix (
  organization_id
  , namespace_id
  , prefix
  , is_active
  , create_at
  , create_user_id
) VALUES (
  '00000000-0000-0000-0000-000000000000'
  , 'NS0001'
  , 'Alchemia'
  , TRUE
  , NOW()
  , 'system'
) ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 3. namespace_term テーブルに 6 件 INSERT
-- ────────────────────────────────────────────────────────────────
INSERT INTO namespace_term (
  organization_id
  , namespace_id
  , prefix
  , localname
  , display_name
  , xsi_type
  , is_active
  , create_at
  , create_user_id
) VALUES
  ( '00000000-0000-0000-0000-000000000000', 'NS0001', 'Alchemia', 'SupervisorDirectiveContent',        '通常指示',           'stringType', TRUE, NOW(), 'system' )
  , ( '00000000-0000-0000-0000-000000000000', 'NS0001', 'Alchemia', 'SupervisorDirectiveCaution',         '安全上の注意事項',   'stringType', TRUE, NOW(), 'system' )
  , ( '00000000-0000-0000-0000-000000000000', 'NS0001', 'Alchemia', 'SupervisorDirectiveOperationNote',   '操作手順上の注記',   'stringType', TRUE, NOW(), 'system' )
  , ( '00000000-0000-0000-0000-000000000000', 'NS0001', 'Alchemia', 'SupervisorDirectiveCheckItem',       '実施前後の確認事項', 'stringType', TRUE, NOW(), 'system' )
  , ( '00000000-0000-0000-0000-000000000000', 'NS0001', 'Alchemia', 'SupervisorDirectiveProhibitedAction','禁止事項',           'stringType', TRUE, NOW(), 'system' )
  , ( '00000000-0000-0000-0000-000000000000', 'NS0001', 'Alchemia', 'SupervisorDirectiveOtherNotes',      'その他注意事項',     'stringType', TRUE, NOW(), 'system' )
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────────
-- 4. project_instruction.instruction_key の旧キー → 新キーに UPDATE
-- ────────────────────────────────────────────────────────────────
-- 旧: SupervisorDirectiveContent → 新: Alchemia:SupervisorDirectiveContent
UPDATE project_instruction
SET instruction_key = 'Alchemia:SupervisorDirectiveContent'
WHERE instruction_key = 'SupervisorDirectiveContent';

-- 旧: mgr-instruction:caution → 新: Alchemia:SupervisorDirectiveCaution
UPDATE project_instruction
SET instruction_key = 'Alchemia:SupervisorDirectiveCaution'
WHERE instruction_key = 'mgr-instruction:caution';

-- 旧: mgr-instruction:operationNote → 新: Alchemia:SupervisorDirectiveOperationNote
UPDATE project_instruction
SET instruction_key = 'Alchemia:SupervisorDirectiveOperationNote'
WHERE instruction_key = 'mgr-instruction:operationNote';

-- 旧: mgr-instruction:checkItem → 新: Alchemia:SupervisorDirectiveCheckItem
UPDATE project_instruction
SET instruction_key = 'Alchemia:SupervisorDirectiveCheckItem'
WHERE instruction_key = 'mgr-instruction:checkItem';

-- 旧: mgr-instruction:prohibitedAction → 新: Alchemia:SupervisorDirectiveProhibitedAction
UPDATE project_instruction
SET instruction_key = 'Alchemia:SupervisorDirectiveProhibitedAction'
WHERE instruction_key = 'mgr-instruction:prohibitedAction';

-- 旧: mgr-instruction:OtherNotes → 新: Alchemia:SupervisorDirectiveOtherNotes
UPDATE project_instruction
SET instruction_key = 'Alchemia:SupervisorDirectiveOtherNotes'
WHERE instruction_key = 'mgr-instruction:OtherNotes';
