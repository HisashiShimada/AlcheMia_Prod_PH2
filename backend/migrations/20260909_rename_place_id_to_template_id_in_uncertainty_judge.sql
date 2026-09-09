-- =============================================================
-- マイグレーション: experiment_uncertainty_judge の place_id カラムを template_id にリネーム
-- 作成日: 2026-09-09
-- 目的:
--   WorkRecordPanel での property_set 特定基準が
--   place_id → template_id（MAIMLの template.id）に変更されたため、
--   experiment_uncertainty_judge テーブルの対応カラムをリネームする。
--
--   あわせてインデックスも再作成する。
-- =============================================================

-- 1. カラムリネーム
ALTER TABLE experiment_uncertainty_judge
  RENAME COLUMN place_id TO template_id;

-- 2. コメント更新
COMMENT ON COLUMN experiment_uncertainty_judge.template_id IS 'テンプレートID（MAIMLの template.id）';

-- 3. 既存インデックスを削除して再作成
DROP INDEX IF EXISTS idx_exp_uncertainty_judge_prop;

CREATE INDEX IF NOT EXISTS idx_exp_uncertainty_judge_prop
    ON experiment_uncertainty_judge (organization_id, project_id, method_id, task_no, transition_id, template_id, property_key, judge_seq DESC);

-- =============================================================
-- ロールバック:
--   DROP INDEX IF EXISTS idx_exp_uncertainty_judge_prop;
--   CREATE INDEX IF NOT EXISTS idx_exp_uncertainty_judge_prop
--       ON experiment_uncertainty_judge (organization_id, project_id, method_id, task_no, transition_id, place_id, property_key, judge_seq DESC);
--   ALTER TABLE experiment_uncertainty_judge RENAME COLUMN template_id TO place_id;
--   COMMENT ON COLUMN experiment_uncertainty_judge.place_id IS 'プレースID';
-- =============================================================
