-- ============================================================
-- project_overall_evaluations テーブル DDL
--
-- @description
--   プロジェクト全体評価レコード（MaiML記録・断面凍結）。
--   applied_rule_snapshot・aggregation_snapshot に集計根拠を凍結保存する。
--
-- @reference docs/design/Alchemia品質管理機能_基本設計書.md §7.2
-- ============================================================

CREATE TABLE IF NOT EXISTS project_overall_evaluations (
  evaluation_id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  organization_id       TEXT        NOT NULL,
  project_id            TEXT        NOT NULL,
  evaluation_scope      TEXT        NOT NULL DEFAULT 'MAIML_PROJECT',
  evaluated_by          TEXT,
  evaluated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_digital       TEXT        CHECK (overall_digital IN ('良好', '要確認', '不良')),
  overall_score         INTEGER,
  overall_analog        TEXT,
  applied_rule_id       UUID        NOT NULL,
  applied_rule_version  INTEGER     NOT NULL,
  applied_rule_snapshot JSONB       NOT NULL,
  aggregation_snapshot  JSONB       NOT NULL,
  create_user_id        TEXT,
  create_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, evaluation_id)
);

CREATE INDEX IF NOT EXISTS ix_project_overall_evaluations_project
  ON project_overall_evaluations (organization_id, project_id, evaluated_at DESC);
