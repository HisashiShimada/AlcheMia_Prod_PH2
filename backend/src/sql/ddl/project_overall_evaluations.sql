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
-- @version 2.0 (2026-08-20) PKをevaluation_seqに変更、evaluated_user_idへリネーム
-- ============================================================

CREATE TABLE IF NOT EXISTS project_overall_evaluations (
  evaluation_seq        SERIAL        NOT NULL,
  organization_id       UUID          NOT NULL,
  project_id            VARCHAR(20)   NOT NULL,
  evaluation_scope      VARCHAR(20)   NOT NULL DEFAULT 'MAIML_PROJECT'
                          CHECK (evaluation_scope IN (
                            'MAIML_PROJECT',
                            'METHOD',
                            'TASK',
                            'TRANSITION_METHOD',
                            'TRANSITION_TASK'
                          )),

  -- 階層識別（下位評価レコードで使用）
  method_id             VARCHAR(100),
  task_no               INTEGER,
  transition_id         VARCHAR(100),

  evaluated_user_id     VARCHAR(50),
  evaluated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  overall_digital       VARCHAR(10)   CHECK (overall_digital IN ('良好', '要確認', '不良')),
  overall_score         INTEGER,
  overall_analog        TEXT,

  -- 全体評価のみ設定、下位評価では NULL
  applied_rule_id       UUID,
  applied_rule_version  INTEGER,
  applied_rule_snapshot JSONB,
  aggregation_snapshot  JSONB,

  create_user_id        VARCHAR(50),
  create_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  update_user_id        VARCHAR(50),
  update_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, project_id, evaluation_seq)
);

CREATE INDEX IF NOT EXISTS ix_project_overall_evaluations_project
  ON project_overall_evaluations (organization_id, project_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS ix_project_overall_evaluations_scope
  ON project_overall_evaluations (organization_id, project_id, evaluation_scope);
