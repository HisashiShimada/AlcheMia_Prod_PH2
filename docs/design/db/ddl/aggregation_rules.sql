-- ===================================================================
-- テーブル名: aggregation_rules（集約ルール）
-- 説明: テナント（組織）共通の階層別サマリー算出ルールを管理するテーブル。
--       status=ACTIVE は同時に1版のみ（アプリ側で制御）。
--       新版を ACTIVE にすると旧版は DEPRECATED へ遷移する。
-- バージョン: 1.0 (2026-08-17)
-- 参照: docs/design/Alchemia品質管理機能_基本設計書.md §7.1
-- ===================================================================

CREATE TABLE IF NOT EXISTS aggregation_rules (
    -- 主キー（複合キー）
    organization_id      TEXT        NOT NULL,
    rule_id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    version              INTEGER     NOT NULL DEFAULT 1,

    -- ステータス管理
    status               TEXT        NOT NULL DEFAULT 'ACTIVE'
                           CHECK (status IN ('ACTIVE', 'DEPRECATED')),

    -- 評価値→スコア写像（特許対応: 良好100・要確認50・不良0）
    score_good           INTEGER     NOT NULL DEFAULT 100,
    score_caution        INTEGER     NOT NULL DEFAULT 50,
    score_bad            INTEGER     NOT NULL DEFAULT 0,

    -- 第1段ロールアップ（多基準対象の代表値決定）
    target_rollup        TEXT        NOT NULL DEFAULT 'WORST_CASE'
                           CHECK (target_rollup IN ('WORST_CASE', 'MAJORITY', 'AVERAGE')),

    -- 第2段集計（階層代表ステータス決定）
    level_status_rule    TEXT        NOT NULL DEFAULT 'WORST_CASE'
                           CHECK (level_status_rule IN ('WORST_CASE', 'MAJORITY')),

    -- 第2段集計（階層スコア決定）
    level_score_rule     TEXT        NOT NULL DEFAULT 'MEAN'
                           CHECK (level_score_rule IN ('MEAN', 'MIN')),

    -- 未評価対象の扱い
    missing_handling     TEXT        NOT NULL DEFAULT 'SEPARATE_COUNT'
                           CHECK (missing_handling IN ('SEPARATE_COUNT', 'EXCLUDE_DENOMINATOR', 'TREAT_AS_GOOD')),

    -- トランジション階層の粒度（合算 or 分離表示）
    transition_hierarchy TEXT        NOT NULL DEFAULT 'MERGE'
                           CHECK (transition_hierarchy IN ('MERGE', 'SPLIT')),

    -- 監査証跡
    created_by           TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- 主キー制約
    CONSTRAINT aggregation_rules_PKC PRIMARY KEY (organization_id, rule_id, version)
);

-- インデックス作成
-- 組織単位でアクティブルールを検索するためのインデックス
CREATE INDEX IF NOT EXISTS idx_aggregation_rules_active
    ON aggregation_rules (organization_id, status)
    WHERE status = 'ACTIVE';

-- テーブルコメント
COMMENT ON TABLE aggregation_rules IS '集約ルールテーブル - テナント（組織）共通の階層別サマリー算出ルール。ACTIVE は同時に1版のみ。';

-- カラムコメント
COMMENT ON COLUMN aggregation_rules.organization_id IS '組織ID（主キー1）';
COMMENT ON COLUMN aggregation_rules.rule_id IS 'ルールID（主キー2）UUID';
COMMENT ON COLUMN aggregation_rules.version IS 'バージョン（主キー3）新版作成時にインクリメント';
COMMENT ON COLUMN aggregation_rules.status IS 'ステータス: ACTIVE / DEPRECATED';
COMMENT ON COLUMN aggregation_rules.score_good IS '良好スコア（既定: 100）';
COMMENT ON COLUMN aggregation_rules.score_caution IS '要確認スコア（既定: 50）';
COMMENT ON COLUMN aggregation_rules.score_bad IS '不良スコア（既定: 0）';
COMMENT ON COLUMN aggregation_rules.target_rollup IS '対象ロールアップ: WORST_CASE / MAJORITY / AVERAGE';
COMMENT ON COLUMN aggregation_rules.level_status_rule IS '階層代表ステータス規則: WORST_CASE / MAJORITY';
COMMENT ON COLUMN aggregation_rules.level_score_rule IS '階層スコア規則: MEAN / MIN';
COMMENT ON COLUMN aggregation_rules.missing_handling IS '未評価の扱い: SEPARATE_COUNT / EXCLUDE_DENOMINATOR / TREAT_AS_GOOD';
COMMENT ON COLUMN aggregation_rules.transition_hierarchy IS 'トランジション階層: MERGE（合算） / SPLIT（分離）';
COMMENT ON COLUMN aggregation_rules.created_by IS '作成者ユーザID';
COMMENT ON COLUMN aggregation_rules.created_at IS '作成日時';
