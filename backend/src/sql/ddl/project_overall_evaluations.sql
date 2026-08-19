-- ============================================================
-- project_overall_evaluations テーブル DDL
--
-- @description
--   プロジェクト全体評価と階層別下位評価レコードを格納。
--   evaluation_scope によって2種類のレコードを区別する。
--
--   [全体評価] evaluation_scope = 'MAIML_PROJECT'
--     applied_rule_snapshot / aggregation_snapshot に集計根拠を凍結保存。
--
--   [下位評価] evaluation_scope = 'METHOD' / 'TASK' /
--              'TRANSITION_METHOD' / 'TRANSITION_TASK'
--     overall_digital / overall_analog に評価値・コメントを保存。
--     applied_rule_snapshot / aggregation_snapshot は NULL。
--     method_id / task_no / transition_id で対象を特定。
--
-- @reference docs/design/Alchemia品質管理機能_基本設計書.md §7.2
-- @version 1.1 (2026-08-17) 下位評価対応カラム追加
-- ============================================================

CREATE TABLE IF NOT EXISTS project_overall_evaluations (
  evaluation_id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  organization_id       TEXT        NOT NULL,
  project_id            TEXT        NOT NULL,
  evaluation_scope      TEXT        NOT NULL DEFAULT 'MAIML_PROJECT'
                          CHECK (evaluation_scope IN (
                            'MAIML_PROJECT',
                            'METHOD',
                            'TASK',
                            'TRANSITION_METHOD',
                            'TRANSITION_TASK'
                          )),

  -- 階層識別（下位評価レコードで使用）
  method_id             TEXT,
  task_no               INTEGER,
  transition_id         TEXT,

  evaluated_by          TEXT,
  evaluated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_digital       TEXT        CHECK (overall_digital IN ('良好', '要確認', '不良')),
  overall_score         INTEGER,
  overall_analog        TEXT,

  -- 全体評価のみ設定、下位評価では NULL
  applied_rule_id       UUID,
  applied_rule_version  INTEGER,
  applied_rule_snapshot JSONB,
  aggregation_snapshot  JSONB,

  create_user_id        TEXT,
  create_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, evaluation_id)
);

CREATE INDEX IF NOT EXISTS ix_project_overall_evaluations_project
  ON project_overall_evaluations (organization_id, project_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS ix_project_overall_evaluations_scope
  ON project_overall_evaluations (organization_id, project_id, evaluation_scope);
