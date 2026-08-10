-- マイグレーション: project_instruction テーブルに instruction_key カラム追加
-- 作成日: 2026-08-07
-- 目的: プロジェクト指示ダイアログで選択した指示種別（MAIMLのpropertyタグキー）を保存するため

-- instruction_key カラムを追加（まず NULL 許容で追加）
ALTER TABLE project_instruction
  ADD COLUMN IF NOT EXISTS instruction_key VARCHAR(100) DEFAULT NULL;

-- 既存の NULL / 空文字データをデフォルトキー（通常指示）に置換
UPDATE project_instruction
SET instruction_key = 'SupervisorDirectiveContent'
WHERE instruction_key IS NULL OR instruction_key = '';

-- NOT NULL 制約を追加
ALTER TABLE project_instruction
  ALTER COLUMN instruction_key SET NOT NULL;

COMMENT ON COLUMN project_instruction.instruction_key IS
  'MAIMLのpropertyタグキー（mgr-instruction:caution 等）。デフォルトは SupervisorDirectiveContent（通常指示）。';
