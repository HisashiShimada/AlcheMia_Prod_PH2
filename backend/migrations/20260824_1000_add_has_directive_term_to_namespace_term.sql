-- ===================================================================
-- マイグレーション: namespace_term に has_directive_term カラムを追加
-- 実行日時: 2026-08-24 10:00
-- 説明: 新規用語作成時の指示用語同時登録機能対応
-- ===================================================================

-- has_directive_term カラムを追加（冪等性確保）
ALTER TABLE namespace_term
  ADD COLUMN IF NOT EXISTS has_directive_term BOOLEAN NOT NULL DEFAULT FALSE;

-- コメント追加
COMMENT ON COLUMN namespace_term.has_directive_term IS '指示用語フラグ:TRUE=指示用語が登録されている FALSE=指示用語なし';

-- 既存の Alchemia システム固定指示用語（SupervisorDirective* パターン）を TRUE に更新
-- TemplateEditorDialog の用語フィルタで既存動作を維持するため
UPDATE namespace_term
SET has_directive_term = TRUE
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
  AND localname LIKE 'SupervisorDirective%';
