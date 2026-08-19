-- ===================================================================
-- マイグレーション: 20260817_extend_project_overall_evaluations
-- 説明: project_overall_evaluations テーブルに下位評価対応カラムを追加し、
--       全体評価専用だった NOT NULL 制約を緩和する。
--
-- 対象テーブル: project_overall_evaluations
-- 変更内容:
--   1. カラム追加: method_id / task_no / transition_id
--   2. NOT NULL 制約を解除: applied_rule_id / applied_rule_version /
--                           applied_rule_snapshot / aggregation_snapshot
--   3. evaluation_scope に CHECK 制約を追加（既存値 'MAIML_PROJECT' は互換）
--   4. インデックス追加: evaluation_scope 検索用
--
-- ロールバック手順（適用後に問題が発生した場合）:
--   ALTER TABLE project_overall_evaluations
--     DROP COLUMN IF EXISTS method_id,
--     DROP COLUMN IF EXISTS task_no,
--     DROP COLUMN IF EXISTS transition_id,
--     ALTER COLUMN applied_rule_id      SET NOT NULL,
--     ALTER COLUMN applied_rule_version SET NOT NULL,
--     ALTER COLUMN applied_rule_snapshot SET NOT NULL,
--     ALTER COLUMN aggregation_snapshot  SET NOT NULL;
--   DROP INDEX IF EXISTS ix_project_overall_evaluations_scope;
--
-- 作成日: 2026-08-17
-- ===================================================================

BEGIN;

-- 1. 階層識別用カラムを追加
ALTER TABLE project_overall_evaluations
    ADD COLUMN IF NOT EXISTS method_id       TEXT,
    ADD COLUMN IF NOT EXISTS task_no         INTEGER,
    ADD COLUMN IF NOT EXISTS transition_id   TEXT;

-- 2. 全体評価専用だった NOT NULL 制約を緩和
--    （下位評価レコードでは rule/snapshot が不要なため）
ALTER TABLE project_overall_evaluations
    ALTER COLUMN applied_rule_id      DROP NOT NULL,
    ALTER COLUMN applied_rule_version DROP NOT NULL,
    ALTER COLUMN applied_rule_snapshot DROP NOT NULL,
    ALTER COLUMN aggregation_snapshot  DROP NOT NULL;

-- 3. evaluation_scope に CHECK 制約を追加
--    （既存の 'MAIML_PROJECT' は互換、新しいスコープ値を許可）
ALTER TABLE project_overall_evaluations
    ADD CONSTRAINT chk_evaluation_scope
        CHECK (evaluation_scope IN (
            'MAIML_PROJECT',
            'METHOD',
            'TASK',
            'TRANSITION_METHOD',
            'TRANSITION_TASK'
        ));

-- 4. evaluation_scope 検索用インデックスを追加
CREATE INDEX IF NOT EXISTS ix_project_overall_evaluations_scope
    ON project_overall_evaluations (organization_id, project_id, evaluation_scope);

-- カラムコメント追加
COMMENT ON COLUMN project_overall_evaluations.method_id     IS 'メソッドID（下位評価で使用）';
COMMENT ON COLUMN project_overall_evaluations.task_no       IS 'タスク番号（TASK / TRANSITION_TASK で使用）';
COMMENT ON COLUMN project_overall_evaluations.transition_id IS 'トランジションID（TRANSITION_* で使用）';

COMMIT;
