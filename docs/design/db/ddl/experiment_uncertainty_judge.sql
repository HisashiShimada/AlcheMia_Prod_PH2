-- ===================================================================
-- テーブル名: experiment_uncertainty_judge (実験不確かさ判定結果)
-- 説明: 作業者が WorkRecordPanel で入力した Uncertainty Value と
--       uncertainty_criteria の tolerance_upper/lower による良好/不良判定結果を管理する。
-- バージョン: 1.0 (2026-08-26)
-- ===================================================================

-- 既存テーブルが存在する場合は削除
DROP TABLE IF EXISTS experiment_uncertainty_judge CASCADE;

CREATE TABLE experiment_uncertainty_judge (
    -- 主キー
    id                      BIGSERIAL               NOT NULL,

    -- 所属プロジェクト情報（マルチテナント分離）
    organization_id         UUID                    NOT NULL,
    project_id              CHARACTER VARYING(20)   NOT NULL,
    method_id               CHARACTER VARYING       NOT NULL,
    task_no                 NUMERIC(3,0)            NOT NULL,
    transition_id           CHARACTER VARYING       NOT NULL,

    -- プロパティ情報（どのプロパティへの不確かさ記録か）
    place_id                CHARACTER VARYING       NOT NULL,  -- テンプレートが紐づく Place ID
    property_key            CHARACTER VARYING       NOT NULL,  -- プロパティの key

    -- 不確かさ基準情報（判定時点のスナップショット）
    uncertainty_key         CHARACTER VARYING(50)   NOT NULL,
    uncertainty_version     INTEGER                 NOT NULL,
    tolerance_upper         NUMERIC(20,10),                    -- 判定時点の許容上限値
    tolerance_lower         NUMERIC(20,10),                    -- 判定時点の許容下限値

    -- 判定結果
    recorded_value          NUMERIC(20,10)          NOT NULL,  -- 作業者が入力した値
    judge_result            CHARACTER VARYING(10)   NOT NULL,  -- '良好' または '不良'

    -- 監査証跡
    create_user_id          VARCHAR(50),
    create_at               TIMESTAMP,

    -- 主キー制約
    CONSTRAINT experiment_uncertainty_judge_pkey PRIMARY KEY (id)
);

-- インデックス作成
-- プロジェクト・タスク単位の検索用（判定結果一覧取得）
CREATE INDEX idx_exp_uncertainty_judge_project
    ON experiment_uncertainty_judge (organization_id, project_id, method_id, task_no);

-- プロパティ別最新判定取得用
CREATE INDEX idx_exp_uncertainty_judge_prop
    ON experiment_uncertainty_judge (organization_id, project_id, method_id, task_no, transition_id, place_id, property_key, id DESC);

-- テーブルコメント
COMMENT ON TABLE experiment_uncertainty_judge IS '実験不確かさ判定結果テーブル - WorkRecordPanel での手入力値と tolerance による良好/不良判定結果を管理';

-- カラムコメント
COMMENT ON COLUMN experiment_uncertainty_judge.id IS '自動採番主キー';
COMMENT ON COLUMN experiment_uncertainty_judge.organization_id IS '組織ID（マルチテナント分離）';
COMMENT ON COLUMN experiment_uncertainty_judge.project_id IS 'プロジェクトID';
COMMENT ON COLUMN experiment_uncertainty_judge.method_id IS 'メソッドID';
COMMENT ON COLUMN experiment_uncertainty_judge.task_no IS 'タスク番号';
COMMENT ON COLUMN experiment_uncertainty_judge.transition_id IS 'トランジションID';
COMMENT ON COLUMN experiment_uncertainty_judge.place_id IS 'テンプレートが紐づく Place ID';
COMMENT ON COLUMN experiment_uncertainty_judge.property_key IS 'プロパティの key';
COMMENT ON COLUMN experiment_uncertainty_judge.uncertainty_key IS '不確かさ基準Key（判定時スナップショット）';
COMMENT ON COLUMN experiment_uncertainty_judge.uncertainty_version IS '不確かさ基準バージョン（判定時スナップショット）';
COMMENT ON COLUMN experiment_uncertainty_judge.tolerance_upper IS '判定時点の許容上限値';
COMMENT ON COLUMN experiment_uncertainty_judge.tolerance_lower IS '判定時点の許容下限値';
COMMENT ON COLUMN experiment_uncertainty_judge.recorded_value IS '作業者が入力した不確かさ値';
COMMENT ON COLUMN experiment_uncertainty_judge.judge_result IS '判定結果: 良好 または 不良';
COMMENT ON COLUMN experiment_uncertainty_judge.create_user_id IS '記録者ユーザID';
COMMENT ON COLUMN experiment_uncertainty_judge.create_at IS '判定記録日時';
