-- ===================================================================
-- テーブル名: project_overall_evaluations（プロジェクト評価）
-- 説明: プロジェクト全体評価および階層別下位評価レコードを管理するテーブル。
--       evaluation_scope によって2種類のレコードを格納する。
--
--       [全体評価レコード] evaluation_scope = 'MAIML_PROJECT'
--         - applied_rule_snapshot / aggregation_snapshot に集計根拠を凍結保存
--         - method_id / task_no / transition_id は NULL
--
--       [下位評価レコード] evaluation_scope = 'METHOD' / 'TASK' /
--                          'TRANSITION_METHOD' / 'TRANSITION_TASK'
--         - overall_digital / overall_analog に評価値・コメントを保存
--         - applied_rule_snapshot / aggregation_snapshot は NULL
--         - method_id / task_no / transition_id で対象を特定
--
-- バージョン: 1.1 (2026-08-17) ← v1.0 から下位評価対応カラムを追加
-- 参照: docs/design/Alchemia品質管理機能_基本設計書.md §7.2
-- ===================================================================

CREATE TABLE IF NOT EXISTS project_overall_evaluations (
    -- 主キー
    evaluation_id         UUID        NOT NULL DEFAULT gen_random_uuid(),
    organization_id       TEXT        NOT NULL,

    -- プロジェクト・評価スコープ
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
    method_id             TEXT,                   -- METHOD / TASK / TRANSITION_* で設定
    task_no               INTEGER,                -- TASK / TRANSITION_TASK で設定
    transition_id         TEXT,                   -- TRANSITION_* で設定

    -- 評価者・日時
    evaluated_by          TEXT,
    evaluated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 評価値
    overall_digital       TEXT        CHECK (overall_digital IN ('良好', '要確認', '不良')),
    overall_score         INTEGER,                -- 任意の数値スコア（全体評価のみ）
    overall_analog        TEXT,                   -- アナログ評価（コメント）

    -- 集計根拠（全体評価レコードのみ設定、下位評価では NULL）
    applied_rule_id       UUID,
    applied_rule_version  INTEGER,
    applied_rule_snapshot JSONB,                  -- ルールパラメータの凍結値
    aggregation_snapshot  JSONB,                  -- levels / sourceEvaluations / attentionItems

    -- 監査証跡
    create_user_id        TEXT,
    create_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 主キー制約
    CONSTRAINT project_overall_evaluations_PKC PRIMARY KEY (organization_id, evaluation_id)
);

-- インデックス作成
-- プロジェクト単位・日時降順での全体評価取得用
CREATE INDEX IF NOT EXISTS ix_project_overall_evaluations_project
    ON project_overall_evaluations (organization_id, project_id, evaluated_at DESC);

-- evaluation_scope でのフィルタリング用（下位評価取得）
CREATE INDEX IF NOT EXISTS ix_project_overall_evaluations_scope
    ON project_overall_evaluations (organization_id, project_id, evaluation_scope);

-- テーブルコメント
COMMENT ON TABLE project_overall_evaluations IS 'プロジェクト評価テーブル - 全体評価（断面凍結）と下位評価（METHOD/TASK/TRANSITION別）を格納。';

-- カラムコメント
COMMENT ON COLUMN project_overall_evaluations.evaluation_id IS '評価ID（主キー1）UUID';
COMMENT ON COLUMN project_overall_evaluations.organization_id IS '組織ID（主キー2）';
COMMENT ON COLUMN project_overall_evaluations.project_id IS 'プロジェクトID';
COMMENT ON COLUMN project_overall_evaluations.evaluation_scope IS '評価スコープ: MAIML_PROJECT / METHOD / TASK / TRANSITION_METHOD / TRANSITION_TASK';
COMMENT ON COLUMN project_overall_evaluations.method_id IS 'メソッドID（下位評価で使用）';
COMMENT ON COLUMN project_overall_evaluations.task_no IS 'タスク番号（TASK / TRANSITION_TASK で使用）';
COMMENT ON COLUMN project_overall_evaluations.transition_id IS 'トランジションID（TRANSITION_* で使用）';
COMMENT ON COLUMN project_overall_evaluations.evaluated_by IS '評価者ユーザID';
COMMENT ON COLUMN project_overall_evaluations.evaluated_at IS '評価日時';
COMMENT ON COLUMN project_overall_evaluations.overall_digital IS 'デジタル評価値: 良好 / 要確認 / 不良';
COMMENT ON COLUMN project_overall_evaluations.overall_score IS '数値スコア（任意、全体評価のみ）';
COMMENT ON COLUMN project_overall_evaluations.overall_analog IS 'アナログ評価（コメント）';
COMMENT ON COLUMN project_overall_evaluations.applied_rule_id IS '適用ルールID（全体評価のみ）';
COMMENT ON COLUMN project_overall_evaluations.applied_rule_version IS '適用ルールバージョン（全体評価のみ）';
COMMENT ON COLUMN project_overall_evaluations.applied_rule_snapshot IS 'ルールパラメータの凍結値 JSONB（全体評価のみ）';
COMMENT ON COLUMN project_overall_evaluations.aggregation_snapshot IS '集計結果断面 JSONB: levels / sourceEvaluations / attentionItems（全体評価のみ）';
COMMENT ON COLUMN project_overall_evaluations.create_user_id IS '作成者ユーザID';
COMMENT ON COLUMN project_overall_evaluations.create_at IS '作成日時';
