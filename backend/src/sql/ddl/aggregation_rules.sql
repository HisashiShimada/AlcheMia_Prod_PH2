-- ============================================================
-- aggregation_rules テーブル DDL
--
-- @description
--   テナント共通の集約ルール。
--   status=ACTIVE は同時に1版のみ（アプリ側で制御）。
--
-- @reference docs/design/Alchemia品質管理機能_基本設計書.md §7.1
-- ============================================================

CREATE TABLE IF NOT EXISTS aggregation_rules (
  rule_id              UUID        NOT NULL DEFAULT gen_random_uuid(),
  organization_id      TEXT        NOT NULL,
  version              INTEGER     NOT NULL DEFAULT 1,
  status               TEXT        NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE', 'DEPRECATED')),
  score_good           INTEGER     NOT NULL DEFAULT 100,
  score_caution        INTEGER     NOT NULL DEFAULT 50,
  score_bad            INTEGER     NOT NULL DEFAULT 0,
  target_rollup        TEXT        NOT NULL DEFAULT 'WORST_CASE'
                         CHECK (target_rollup IN ('WORST_CASE', 'MAJORITY', 'AVERAGE')),
  level_status_rule    TEXT        NOT NULL DEFAULT 'WORST_CASE'
                         CHECK (level_status_rule IN ('WORST_CASE', 'MAJORITY')),
  level_score_rule     TEXT        NOT NULL DEFAULT 'MEAN'
                         CHECK (level_score_rule IN ('MEAN', 'MIN')),
  missing_handling     TEXT        NOT NULL DEFAULT 'SEPARATE_COUNT'
                         CHECK (missing_handling IN ('SEPARATE_COUNT', 'EXCLUDE_DENOMINATOR', 'TREAT_AS_GOOD')),
  transition_hierarchy TEXT        NOT NULL DEFAULT 'MERGE'
                         CHECK (transition_hierarchy IN ('MERGE', 'SPLIT')),
  created_by           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, rule_id, version)
);
